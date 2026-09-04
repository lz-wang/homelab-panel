package mcpserver

import "context"

type contextKey string

const (
	remoteAddrContextKey contextKey = "mcp_remote_addr"
	scopeContextKey      contextKey = "mcp_scope"
)

// WithRemoteAddr 将客户端地址写入 context，供审计日志使用。
func WithRemoteAddr(ctx context.Context, addr string) context.Context {
	return context.WithValue(ctx, remoteAddrContextKey, addr)
}

// RemoteAddrFromContext 取出客户端地址；缺省返回空串。
func RemoteAddrFromContext(ctx context.Context) string {
	addr, _ := ctx.Value(remoteAddrContextKey).(string)
	return addr
}

func WithScope(ctx context.Context, scope string) context.Context {
	return context.WithValue(ctx, scopeContextKey, scope)
}

// ScopeFromContext 返回 token scope；旧 token 的空 scope 兼容为 write。
func ScopeFromContext(ctx context.Context) string {
	scope, _ := ctx.Value(scopeContextKey).(string)
	if scope == "" {
		return "write"
	}
	return scope
}
