package handlers

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"

	"github.com/gin-gonic/gin"
	"golang.org/x/sync/singleflight"
)

// Iconify 图标本地缓存：面板数据仍只保存 iconify 名称（如 mdi:server-network），
// 首次访问时服务端从公网 API 取回 SVG、校验后落盘 data/iconify/，
// 之后永远本地返回——首页不再依赖 api.iconify.design，离线也可用。
//
// 读取路径：内存缓存 → 磁盘缓存 → singleflight 包裹的上游抓取（落盘后回填内存）。
// 同一图标并发首访只有一次真正上游请求；服务启动与面板保存后还会后台预热，
// 首页请求通常全部命中本地缓存。

const (
	iconifyCacheDir    = "iconify"
	iconifyMaxSVGBytes = 64 << 10 // 单个图标 SVG 上限 64 KiB

	// 内存缓存条目上限：超出后不再写入（面板图标数远小于该值，仅作防御）。
	iconifyMemoryMaxEntries = 2048

	// 预热固定并发，避免一次几十个图标同时打 Iconify API。
	iconifyPrewarmConcurrency = 4
	iconifyPrewarmTimeout     = 5 * time.Minute

	// read-through 兜底路径的上游抓取超时（与 HTTP client 超时叠加兜底）。
	iconifyFetchTimeout = 15 * time.Second

	// ItemIcon.ItemType 的 Iconify 类型。
	iconItemTypeIconify = 3
)

// 上游与 HTTP 客户端做成包级变量，测试中可替换为本地 httptest 服务器。
var (
	iconifyBaseURL    = "https://api.iconify.design"
	iconifyHTTPClient = &http.Client{Timeout: 10 * time.Second}

	iconifyNameRE = regexp.MustCompile(`^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$`)
	eventAttrRE   = regexp.MustCompile(`\son[a-z]+\s*=`)

	errInvalidIconName = errors.New("invalid icon name")

	// 同名图标的在途请求合并：并发首访只穿透一次。
	iconifyFetchGroup  singleflight.Group
	iconifyMemory      sync.Map // name -> []byte
	iconifyMemoryCount atomic.Int32
)

func storeIconMemory(name string, data []byte) {
	if iconifyMemoryCount.Load() >= iconifyMemoryMaxEntries {
		return
	}
	if _, loaded := iconifyMemory.LoadOrStore(name, data); !loaded {
		iconifyMemoryCount.Add(1)
	}
}

// GetIconifyIcon 返回指定图标名的 SVG（公开只读：首页访客也需要渲染图标）。
// read-through 兜底：预热尚未完成时由请求自己补齐缓存。
func (h *Handler) GetIconifyIcon(c *gin.Context) {
	name := strings.ToLower(c.Param("name"))

	// 上游抓取用独立 context：singleflight 结果被并发请求共享，
	// 不允许 leader 请求断开时取消其他等待者。
	ctx, cancel := context.WithTimeout(context.Background(), iconifyFetchTimeout)
	defer cancel()

	data, err := h.iconSVG(ctx, name)
	if err != nil {
		if errors.Is(err, errInvalidIconName) {
			writeError(c, http.StatusBadRequest, "invalid icon name")
			return
		}
		logging.Warnf("fetch iconify icon %s failed: %v", name, err)
		writeError(c, http.StatusBadGateway, "fetch icon failed")
		return
	}

	serveIconSVG(c, data)
}

// iconSVG 返回图标内容：内存 → 磁盘 → singleflight(上游抓取 + 落盘)。
func (h *Handler) iconSVG(ctx context.Context, name string) ([]byte, error) {
	if v, ok := iconifyMemory.Load(name); ok {
		return v.([]byte), nil
	}

	prefix, icon, ok := splitIconifyName(name)
	if !ok {
		return nil, errInvalidIconName
	}

	cachePath := filepath.Join(h.DataDir, iconifyCacheDir, prefix+"-"+icon+".svg")
	if data, err := os.ReadFile(cachePath); err == nil {
		storeIconMemory(name, data)
		return data, nil
	}

	v, err, _ := iconifyFetchGroup.Do(name, func() (any, error) {
		// double-check：排队期间其他调用者可能已抓取落盘。
		if data, err := os.ReadFile(cachePath); err == nil {
			storeIconMemory(name, data)
			return data, nil
		}

		data, err := fetchIconifySVG(ctx, prefix, icon)
		if err != nil {
			return nil, err
		}

		if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
			logging.Warnf("create iconify cache dir failed: %v", err)
		} else if err := os.WriteFile(cachePath, data, 0o644); err != nil {
			logging.Warnf("write iconify cache %s failed: %v", name, err)
		}
		logging.Infof("iconify icon cached: %s", name)
		storeIconMemory(name, data)
		return data, nil
	})
	if err != nil {
		return nil, err
	}
	return v.([]byte), nil
}

// collectIconifyNames 收集面板 items 中所有 Iconify 图标名（itemType=3，text 为名称）。
func collectIconifyNames(items []data.Item) []string {
	names := make([]string, 0, len(items))
	for _, it := range items {
		if it.Icon != nil && it.Icon.ItemType == iconItemTypeIconify && it.Icon.Text != "" {
			names = append(names, it.Icon.Text)
		}
	}
	return names
}

// StartIconifyPrewarm 读取当前面板并在后台预热所有 Iconify 图标。
// 在服务启动（开始监听）时调用一次。
func (h *Handler) StartIconifyPrewarm() {
	if h.Store == nil {
		return
	}
	snap := h.Store.Snapshot()
	h.PrewarmIconifyIcons(collectIconifyNames(snap.Panel.Items))
}

// PrewarmIconifyIcons 后台预热给定图标名：独立 context + 固定并发，不阻塞调用方。
// 已存在（内存/磁盘）的图标自然跳过上游；失败仅记录 WARN，read-through 仍是兜底。
func (h *Handler) PrewarmIconifyIcons(names []string) {
	// 预热不借用任何 HTTP request context，服务自身生命周期内自行超时。
	ctx, cancel := context.WithTimeout(context.Background(), iconifyPrewarmTimeout)
	go func() {
		defer cancel()
		h.prewarmIconifyIcons(ctx, names)
	}()
}

// prewarmIconifyIcons 同步预热：去重、忽略非法名，固定并发抓取缺失图标。
func (h *Handler) prewarmIconifyIcons(ctx context.Context, names []string) {
	seen := make(map[string]bool, len(names))
	queue := make([]string, 0, len(names))
	for _, raw := range names {
		name := strings.ToLower(strings.TrimSpace(raw))
		if _, _, ok := splitIconifyName(name); !ok || seen[name] {
			continue
		}
		seen[name] = true
		queue = append(queue, name)
	}
	if len(queue) == 0 {
		return
	}

	jobs := make(chan string)
	var wg sync.WaitGroup
	for range iconifyPrewarmConcurrency {
		wg.Go(func() {
			for name := range jobs {
				if _, err := h.iconSVG(ctx, name); err != nil {
					logging.Warnf("prewarm iconify icon %s failed: %v", name, err)
				}
			}
		})
	}

	for _, name := range queue {
		select {
		case <-ctx.Done():
			close(jobs)
			wg.Wait()
			logging.Warnf("iconify icon prewarm interrupted: %v", ctx.Err())
			return
		case jobs <- name:
		}
	}
	close(jobs)
	wg.Wait()
	logging.Infof("iconify icons prewarmed: %d icons", len(queue))
}

func splitIconifyName(name string) (prefix, icon string, ok bool) {
	matches := iconifyNameRE.FindStringSubmatch(name)
	if matches == nil {
		return "", "", false
	}
	return matches[1], matches[2], true
}

func fetchIconifySVG(ctx context.Context, prefix, icon string) ([]byte, error) {
	url := fmt.Sprintf("%s/%s/%s.svg", iconifyBaseURL, prefix, icon)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := iconifyHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("upstream status %d", resp.StatusCode)
	}

	data, err := io.ReadAll(io.LimitReader(resp.Body, iconifyMaxSVGBytes+1))
	if err != nil {
		return nil, err
	}
	if len(data) == 0 || len(data) > iconifyMaxSVGBytes {
		return nil, fmt.Errorf("unexpected svg size %d", len(data))
	}
	if !isValidIconifySVG(data) {
		return nil, errors.New("upstream response is not a plain svg")
	}
	return data, nil
}

// isValidIconifySVG 只接受以 <svg 开头的纯 SVG；
// 拒绝 script 与内联事件属性，作为内联渲染前的防御层。
func isValidIconifySVG(data []byte) bool {
	text := strings.TrimSpace(string(data))
	if !strings.HasPrefix(text, "<svg") {
		return false
	}

	lower := strings.ToLower(text)
	return !strings.Contains(lower, "<script") && !eventAttrRE.MatchString(lower)
}

func serveIconSVG(c *gin.Context, data []byte) {
	// 图标内容由名称唯一决定且落盘后不再变更，可按年缓存（immutable）。
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Data(http.StatusOK, "image/svg+xml; charset=utf-8", data)
}
