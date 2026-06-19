package app

import "homelab-panel/internal/handlers"

func (s *Server) registerRoutes() {
	h := handlers.NewHandler(handlers.Deps{
		Store:   s.store,
		Logger:  s.logger,
		DataDir: s.config.dataDir(),
		Version: s.config.Version,
		WebFS:   s.config.WebFS,
	})

	api := s.router.Group("/api/v1")
	api.Use(requestLogger(s.logger))
	api.GET("/health", h.Health)
	api.GET("/about", h.About)

	api.GET("/panel", h.GetPanel)

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

	s.router.GET("/uploads/*filepath", h.Upload)
	s.router.NoRoute(h.Static)
}
