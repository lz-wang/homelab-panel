package mcpserver

import "context"

type contextKey string

const (
	scopeContextKey contextKey = "mcp_scope"

	remoteAddrContextKey contextKey = "mcp_remote_addr"

	principalContextKey contextKey = "mcp_principal"

	// scopeReadOnly / scopeReadWrite 与 data.MCPScope 的字符串值保持一致。
	scopeReadOnly  = "read_only"
	scopeReadWrite = "read_write"
)

// WithScope 将 MCP 调用范围写入 request context，供写工具校验权限。
func WithScope(ctx context.Context, scope string) context.Context {
	return context.WithValue(ctx, scopeContextKey, scope)
}

// ScopeFromContext 取出当前请求的 MCP 范围；缺省回退为只读。
func ScopeFromContext(ctx context.Context) string {
	scope, _ := ctx.Value(scopeContextKey).(string)
	if scope == "" {
		return scopeReadOnly
	}
	return scope
}

// WithRemoteAddr 将客户端地址写入 context，供审计日志使用。
func WithRemoteAddr(ctx context.Context, addr string) context.Context {
	return context.WithValue(ctx, remoteAddrContextKey, addr)
}

// RemoteAddrFromContext 取出客户端地址；缺省返回空串。
func RemoteAddrFromContext(ctx context.Context) string {
	addr, _ := ctx.Value(remoteAddrContextKey).(string)
	return addr
}

// WithPrincipal 写入限流主体（token 前缀 + 客户端地址）。
func WithPrincipal(ctx context.Context, principal string) context.Context {
	return context.WithValue(ctx, principalContextKey, principal)
}

// PrincipalFromContext 取出限流主体；缺省返回空串。
func PrincipalFromContext(ctx context.Context) string {
	principal, _ := ctx.Value(principalContextKey).(string)
	return principal
}
