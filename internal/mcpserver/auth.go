package mcpserver

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"homelab-panel/internal/data"
)

// AuthMiddleware 校验 MCP bearer token，并把 token 的 scope 注入 request context。
//
// 鉴权失败统一以 http.Error 返回 401/403；请求行由上层 requestLogger 记录，
// 这里不再重复访问日志。
func AuthMiddleware(store *data.Store, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearerFromHeader(r.Header.Get("Authorization"))
		if token == "" {
			http.Error(w, "missing or invalid bearer token", http.StatusUnauthorized)
			return
		}

		cfg := store.Snapshot().MCP
		if !cfg.Enabled || cfg.TokenHash == "" {
			http.Error(w, "mcp disabled", http.StatusForbidden)
			return
		}
		if !VerifyToken(token, cfg.TokenHash) {
			http.Error(w, "invalid bearer token", http.StatusUnauthorized)
			return
		}

		// 限流主体：token 前缀 + 客户端地址。
		principal := cfg.TokenPrefix
		if principal == "" {
			principal = "noprefix"
		}
		principal = principal + "|" + r.RemoteAddr

		if !overallLimiter.Allow(principal) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		TouchLastUsedAtThrottled(store, time.Minute)

		ctx := WithScope(r.Context(), string(cfg.Scope))
		ctx = WithRemoteAddr(ctx, r.RemoteAddr)
		ctx = WithPrincipal(ctx, principal)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerFromHeader(header string) string {
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, prefix))
}

// lastUsedTracker 节流 last_used_at 落盘，避免每个 MCP 请求都写盘。
var lastUsedTracker struct {
	mu      sync.Mutex
	persist time.Time
}

// TouchLastUsedAtThrottled 至多每 interval 更新一次 MCP.LastUsedAt。
// 首次调用（persist 为零值）必定落盘。
func TouchLastUsedAtThrottled(store *data.Store, interval time.Duration) {
	now := time.Now()

	lastUsedTracker.mu.Lock()
	if now.Sub(lastUsedTracker.persist) < interval {
		lastUsedTracker.mu.Unlock()
		return
	}
	lastUsedTracker.persist = now
	lastUsedTracker.mu.Unlock()

	_ = store.Save(func(d *data.StoreData) error {
		d.MCP.LastUsedAt = now
		return nil
	})
}
