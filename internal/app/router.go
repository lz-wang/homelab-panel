package app

import (
	"homelab-panel/internal/handlers"
	"homelab-panel/internal/mcpserver"
	"homelab-panel/internal/panel"

	"github.com/gin-gonic/gin"
)

func (s *Server) registerRoutes() {
	h := handlers.NewHandler(handlers.Deps{
		Store:   s.store,
		DataDir: s.config.dataDir(),
		Version: s.config.Version,
		WebFS:   s.config.WebFS,
		GoMod:   s.config.GoMod,
	})

	api := s.router.Group("/api/v1")
	api.Use(requestLogger())
	api.GET("/health", h.Health)
	api.GET("/about", h.About)

	api.GET("/panel", h.GetPanel)
	api.GET("/icons/:name", h.GetIconifyIcon)

	api.POST("/admin/session", h.CreateAdminSession)

	protected := api.Group("")
	protected.Use(h.RequireAdmin())
	protected.GET("/admin/session", h.GetAdminSession)
	protected.DELETE("/admin/session", h.DeleteAdminSession)
	protected.PUT("/admin/password", h.UpdateAdminPassword)
	protected.PUT("/panel", h.UpdatePanel)
	protected.POST("/files", h.UploadFiles)
	protected.GET("/files", h.ListFiles)
	protected.DELETE("/files/:id", h.DeleteFile)

	protected.GET("/mcp/settings", h.GetMCPSettings)
	protected.PUT("/mcp/settings", h.UpdateMCPSettings)
	protected.POST("/mcp/token", h.GenerateMCPToken)
	protected.DELETE("/mcp/token/:prefix", h.DeleteMCPToken)

	// MCP Streamable HTTP endpoint。使用独立的 bearer token 鉴权（非管理员 JWT）。
	panelSvc := panel.NewService(s.store)
	mcpHandler := mcpserver.NewHTTPHandler(panelSvc, mcpserver.ServerOptions{
		Version: s.config.Version,
	})
	api.Any("/mcp",
		LimitBodySize(MCPMaxBodyBytes),
		OriginCheck(),
		gin.WrapH(mcpserver.AuthMiddleware(s.store, mcpHandler)))

	s.router.GET("/uploads/*filepath", h.Upload)
	s.router.NoRoute(h.Static)
}
