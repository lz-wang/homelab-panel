package mcpserver

import "context"

type contextKey string

const (
	remoteAddrContextKey contextKey = "mcp_remote_addr"

	principalContextKey contextKey = "mcp_principal"
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

// WithPrincipal 写入限流主体（token 前缀 + 客户端地址）。
func WithPrincipal(ctx context.Context, principal string) context.Context {
	return context.WithValue(ctx, principalContextKey, principal)
}

// PrincipalFromContext 取出限流主体；缺省返回空串。
func PrincipalFromContext(ctx context.Context) string {
	principal, _ := ctx.Value(principalContextKey).(string)
	return principal
}
