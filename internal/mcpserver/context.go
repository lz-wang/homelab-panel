package mcpserver

import "context"

type contextKey string

const (
	scopeContextKey contextKey = "mcp_scope"

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
