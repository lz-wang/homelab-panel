package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

const testIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>`

// resetIconifyCaches 清空包级内存缓存，避免跨测试串扰。
func resetIconifyCaches() {
	iconifyMemory.Clear()
	iconifyMemoryCount.Store(0)
}

func newIconTestRouter(t *testing.T) (*gin.Engine, string) {
	t.Helper()

	resetIconifyCaches()
	gin.SetMode(gin.TestMode)

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/mdi/test-icon.svg") {
			w.Header().Set("Content-Type", "image/svg+xml")
			_, _ = w.Write([]byte(testIconSVG))
			return
		}
		if strings.HasSuffix(r.URL.Path, "/mdi/evil-icon.svg") {
			_, _ = w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`))
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(upstream.Close)

	previousBase := iconifyBaseURL
	iconifyBaseURL = upstream.URL
	t.Cleanup(func() { iconifyBaseURL = previousBase })

	h := NewHandler(Deps{DataDir: t.TempDir()})
	r := gin.New()
	r.GET("/api/v1/icons/:name", h.GetIconifyIcon)
	return r, h.DataDir
}

// newCountingIconUpstream 提供带计数与人为延迟的上游，验证并发去重与预热行为。
func newCountingIconUpstream(t *testing.T) *atomic.Int32 {
	t.Helper()

	resetIconifyCaches()
	hits := &atomic.Int32{}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/mdi/hot-icon.svg") {
			hits.Add(1)
			time.Sleep(80 * time.Millisecond) // 拉开并发窗口
			w.Header().Set("Content-Type", "image/svg+xml")
			_, _ = w.Write([]byte(testIconSVG))
			return
		}
		http.NotFound(w, r)
	}))
	t.Cleanup(upstream.Close)

	previousBase := iconifyBaseURL
	iconifyBaseURL = upstream.URL
	t.Cleanup(func() { iconifyBaseURL = previousBase })
	return hits
}

func TestGetIconifyIconFetchesAndCaches(t *testing.T) {
	r, dataDir := newIconTestRouter(t)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/icons/mdi:test-icon", nil))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	if !strings.HasPrefix(strings.TrimSpace(w.Body.String()), "<svg") {
		t.Errorf("expected svg body, got: %s", w.Body.String())
	}
	if ct := w.Header().Get("Content-Type"); !strings.Contains(ct, "image/svg+xml") {
		t.Errorf("expected svg content type, got: %s", ct)
	}
	if cc := w.Header().Get("Cache-Control"); cc != "public, max-age=31536000, immutable" {
		t.Errorf("expected immutable long cache header, got: %q", cc)
	}

	cached := filepath.Join(dataDir, iconifyCacheDir, "mdi-test-icon.svg")
	if _, err := os.Stat(cached); err != nil {
		t.Fatalf("expected cache file %s: %v", cached, err)
	}
}

func TestGetIconifyIconServesFromLocalCache(t *testing.T) {
	r, dataDir := newIconTestRouter(t)

	// 预置本地缓存，随后让上游不可达，验证不再访问公网。
	cachePath := filepath.Join(dataDir, iconifyCacheDir, "mdi-offline.svg")
	if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(cachePath, []byte(testIconSVG), 0o644); err != nil {
		t.Fatalf("write cache: %v", err)
	}
	iconifyBaseURL = "http://127.0.0.1:0"

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/icons/mdi:offline", nil))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 from local cache, got %d", w.Code)
	}
}

func TestGetIconifyIconRejectsInvalidNames(t *testing.T) {
	r, _ := newIconTestRouter(t)

	// 进入 handler 的非法名：正则校验后返回 400。
	for _, name := range []string{"mdi", "mdi:", ":home", "mdi:home!"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/icons/"+name, nil))

		if w.Code != http.StatusBadRequest {
			t.Errorf("expected 400 for %q, got %d", name, w.Code)
		}
	}

	// 含路径分隔符/穿越的输入在 Gin 路由层即被拒绝（不匹配单段参数）。
	for _, name := range []string{"../etc/passwd", "mdi:a/b"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/icons/"+name, nil))

		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404 for %q, got %d", name, w.Code)
		}
	}
}

func TestGetIconifyIconRejectsScriptSVG(t *testing.T) {
	r, _ := newIconTestRouter(t)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/icons/mdi:evil-icon", nil))

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 for script svg, got %d", w.Code)
	}
}

func TestGetIconifyIconUpstreamNotFound(t *testing.T) {
	r, _ := newIconTestRouter(t)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/v1/icons/mdi:missing", nil))

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502 for missing upstream icon, got %d", w.Code)
	}
}

func TestGetIconifyIconConcurrentShareSingleUpstreamFetch(t *testing.T) {
	hits := newCountingIconUpstream(t)
	h := NewHandler(Deps{DataDir: t.TempDir()})
	r := gin.New()
	r.GET("/api/v1/icons/:name", h.GetIconifyIcon)

	const concurrency = 12
	ws := make([]*httptest.ResponseRecorder, concurrency)
	for i := range ws {
		ws[i] = httptest.NewRecorder()
	}

	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := range concurrency {
		wg.Go(func() {
			<-start
			r.ServeHTTP(ws[i], httptest.NewRequest(http.MethodGet, "/api/v1/icons/mdi:hot-icon", nil))
		})
	}
	close(start)
	wg.Wait()

	for i, w := range ws {
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i, w.Code)
		}
	}
	if got := hits.Load(); got != 1 {
		t.Fatalf("expected exactly 1 upstream fetch, got %d", got)
	}
}

func TestPrewarmIconifyIconsFetchesMissingIcons(t *testing.T) {
	hits := newCountingIconUpstream(t)
	h := NewHandler(Deps{DataDir: t.TempDir()})

	h.prewarmIconifyIcons(context.Background(), []string{"mdi:hot-icon", "mdi:hot-icon", "mdi:hot-icon", "invalid"})

	if got := hits.Load(); got != 1 {
		t.Fatalf("expected exactly 1 upstream fetch after prewarm, got %d", got)
	}
	cached := filepath.Join(h.DataDir, iconifyCacheDir, "mdi-hot-icon.svg")
	if _, err := os.Stat(cached); err != nil {
		t.Fatalf("expected prewarmed cache file %s: %v", cached, err)
	}
}

func TestPrewarmIconifyIconsSkipsCachedIcons(t *testing.T) {
	hits := newCountingIconUpstream(t)
	h := NewHandler(Deps{DataDir: t.TempDir()})

	cachePath := filepath.Join(h.DataDir, iconifyCacheDir, "mdi-hot-icon.svg")
	if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(cachePath, []byte(testIconSVG), 0o644); err != nil {
		t.Fatalf("write cache: %v", err)
	}

	h.prewarmIconifyIcons(context.Background(), []string{"mdi:hot-icon"})

	if got := hits.Load(); got != 0 {
		t.Fatalf("expected no upstream fetch for cached icon, got %d", got)
	}
}

func TestUpdatePanelPrewarmsNewIconifyIcons(t *testing.T) {
	newCountingIconUpstream(t)
	gin.SetMode(gin.TestMode)
	store := mustStore(t)
	h := NewHandler(Deps{Store: store, DataDir: t.TempDir()})
	r := gin.New()
	r.PUT("/api/v1/panel", h.RequireAdmin(), h.UpdatePanel)

	token, _, err := h.tokens.Issue()
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	body, err := json.Marshal(panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items: []itemInput{{
			GroupID: 1,
			Title:   "app",
			URL:     "https://a",
			Icon:    &data.ItemIcon{ItemType: 3, Text: "mdi:hot-icon"},
		}},
	})
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/panel", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}

	// 预热在后台 goroutine 中执行，轮询等待缓存文件落盘。
	cachePath := filepath.Join(h.DataDir, iconifyCacheDir, "mdi-hot-icon.svg")
	deadline := time.Now().Add(5 * time.Second)
	for {
		if _, err := os.Stat(cachePath); err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("prewarm did not write cache file %s", cachePath)
		}
		time.Sleep(50 * time.Millisecond)
	}
}

func TestCollectIconifyNames(t *testing.T) {
	items := []data.Item{
		{ID: 1, Icon: &data.ItemIcon{ItemType: 3, Text: "mdi:home"}},
		{ID: 2, Icon: &data.ItemIcon{ItemType: 2, Text: "mdi:not-iconify", Src: "a.png"}},
		{ID: 3, Icon: &data.ItemIcon{ItemType: 3, Text: ""}},
		{ID: 4},
	}

	names := collectIconifyNames(items)
	if len(names) != 1 || names[0] != "mdi:home" {
		t.Fatalf("expected [mdi:home], got %v", names)
	}
}
