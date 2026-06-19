package mcpserver

import (
	"net/http"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"homelab-panel/internal/panel"
)

// ServerOptions 配置 MCP 服务端的版本信息。
type ServerOptions struct {
	Version string
}

// NewServer 创建挂载了 HomeLab Panel 工具的 MCP Server。
//
// 工具注册在独立的 register* 函数中完成（见 tools_read.go / tools_write.go），
// 本函数仅负责装配 Server 本身。
func NewServer(panelSvc *panel.Service, opts ServerOptions) *mcp.Server {
	version := opts.Version
	if version == "" {
		version = "v0.1.0"
	}

	s := mcp.NewServer(&mcp.Implementation{
		Name:    "homelab-panel",
		Title:   "HomeLab Panel",
		Version: version,
	}, nil)

	registerReadTools(s, panelSvc)
	registerWriteTools(s, panelSvc)

	return s
}

// NewHTTPHandler 构造 Streamable HTTP handler，供 Gin 通过 gin.WrapH 挂载。
//
// 选项取舍（见 plan-1.md Phase 5）：
//   - Stateless=true：当前仅需 tools/call，服务端不会主动请求客户端
//   - JSONResponse=true：便于 curl / Codex / Claude Code 调试
//   - SessionTimeout=5m：回收空闲 session
//   - 保留 SDK 默认的 localhost DNS rebinding 保护
//
// SDK 内部使用 *slog.Logger 做协议级调试日志，这里保持 nil 让其使用默认实现；
// 应用层操作日志（鉴权、工具调用、审计）仍统一走 internal/logging。
func NewHTTPHandler(panelSvc *panel.Service, opts ServerOptions) http.Handler {
	server := NewServer(panelSvc, opts)

	return mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{
			Stateless:      true,
			JSONResponse:   true,
			SessionTimeout: 5 * time.Minute,
		},
	)
}
