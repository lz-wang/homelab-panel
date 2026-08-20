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
	"time"

	"homelab-panel/internal/logging"

	"github.com/gin-gonic/gin"
)

// Iconify 图标本地缓存：面板数据仍只保存 iconify 名称（如 mdi:server-network），
// 首次访问时服务端从公网 API 取回 SVG、校验后落盘 data/iconify/，
// 之后永远本地返回——首页不再依赖 api.iconify.design，离线也可用。

const (
	iconifyCacheDir    = "iconify"
	iconifyMaxSVGBytes = 64 << 10 // 单个图标 SVG 上限 64 KiB
)

// 上游与 HTTP 客户端做成包级变量，测试中可替换为本地 httptest 服务器。
var (
	iconifyBaseURL    = "https://api.iconify.design"
	iconifyHTTPClient = &http.Client{Timeout: 10 * time.Second}

	iconifyNameRE = regexp.MustCompile(`^([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)$`)
	eventAttrRE   = regexp.MustCompile(`\son[a-z]+\s*=`)
)

// GetIconifyIcon 返回指定图标名的 SVG（公开只读：首页访客也需要渲染图标）。
func (h *Handler) GetIconifyIcon(c *gin.Context) {
	name := strings.ToLower(c.Param("name"))

	prefix, icon, ok := splitIconifyName(name)
	if !ok {
		writeError(c, http.StatusBadRequest, "invalid icon name")
		return
	}

	cachePath := filepath.Join(h.DataDir, iconifyCacheDir, prefix+"-"+icon+".svg")

	if data, err := os.ReadFile(cachePath); err == nil {
		serveIconSVG(c, data)
		return
	}

	data, err := fetchIconifySVG(c.Request.Context(), prefix, icon)
	if err != nil {
		logging.Warnf("fetch iconify icon %s failed: %v", name, err)
		writeError(c, http.StatusBadGateway, "fetch icon failed")
		return
	}

	if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
		logging.Warnf("create iconify cache dir failed: %v", err)
	} else if err := os.WriteFile(cachePath, data, 0o644); err != nil {
		logging.Warnf("write iconify cache %s failed: %v", name, err)
	}
	logging.Infof("iconify icon cached: %s", name)

	serveIconSVG(c, data)
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
	// 图标内容由名称唯一决定，可被浏览器与中间层安全缓存。
	c.Header("Cache-Control", "public, max-age=604800")
	c.Data(http.StatusOK, "image/svg+xml; charset=utf-8", data)
}
