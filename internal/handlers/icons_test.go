package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

const testIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>`

func newIconTestRouter(t *testing.T) (*gin.Engine, string) {
	t.Helper()

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
	if cc := w.Header().Get("Cache-Control"); !strings.Contains(cc, "max-age") {
		t.Errorf("expected cache-control header, got: %q", cc)
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
