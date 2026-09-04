package mcpserver

import "context"

type contextKey string

// Scope 是经鉴权后允许暴露的 MCP 工具权限。
type Scope string

const (
	ScopeRead  Scope = "read"
	ScopeWrite Scope = "write"
)

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

func WithScope(ctx context.Context, scope Scope) context.Context {
	return context.WithValue(ctx, scopeContextKey, scope)
}

// ScopeFromContext 返回经鉴权后写入的 scope。缺失或无效值不授予写权限。
func ScopeFromContext(ctx context.Context) Scope {
	scope, _ := ctx.Value(scopeContextKey).(Scope)
	return scope
}
