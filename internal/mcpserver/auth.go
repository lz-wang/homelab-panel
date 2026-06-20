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
		if !cfg.Enabled || len(cfg.Tokens) == 0 {
			http.Error(w, "mcp disabled", http.StatusForbidden)
			return
		}

		// 与任意一个已签发 token 匹配即通过；记录命中前缀用于限流与审计。
		matchedPrefix := ""
		matched := false
		for _, t := range cfg.Tokens {
			if VerifyToken(token, t.Hash) {
				matchedPrefix = t.Prefix
				matched = true
				break
			}
		}
		if !matched {
			http.Error(w, "invalid bearer token", http.StatusUnauthorized)
			return
		}

		// 限流主体：token 前缀 + 客户端地址。
		principal := matchedPrefix
		if principal == "" {
			principal = "noprefix"
		}
		principal = principal + "|" + r.RemoteAddr

		if !overallLimiter.Allow(principal) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		TouchTokenLastUsedAt(store, matchedPrefix, time.Minute)

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

// lastUsedTracker 按 token 前缀节流 last_used_at 落盘，避免每个 MCP 请求都写盘。
var lastUsedTracker struct {
	mu      sync.Mutex
	persist map[string]time.Time
}

func init() {
	lastUsedTracker.persist = make(map[string]time.Time)
}

// TouchTokenLastUsedAt 至多每 interval 更新一次指定前缀 token 的 LastUsedAt。
// 首次调用（该前缀无记录）必定落盘。
func TouchTokenLastUsedAt(store *data.Store, prefix string, interval time.Duration) {
	now := time.Now()

	lastUsedTracker.mu.Lock()
	if now.Sub(lastUsedTracker.persist[prefix]) < interval {
		lastUsedTracker.mu.Unlock()
		return
	}
	lastUsedTracker.persist[prefix] = now
	lastUsedTracker.mu.Unlock()

	_ = store.Save(func(d *data.StoreData) error {
		for i := range d.MCP.Tokens {
			if d.MCP.Tokens[i].Prefix == prefix {
				d.MCP.Tokens[i].LastUsedAt = now
				return nil
			}
		}
		return nil
	})
}
