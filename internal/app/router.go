package app

import "homelab-panel/internal/handlers"

func (s *Server) registerRoutes() {
	h := handlers.NewHandler(handlers.Deps{
		DB:      s.db,
		Logger:  s.logger,
		DataDir: s.config.dataDir(),
		Version: s.config.Version,
		WebFS:   s.config.WebFS,
	})

	api := s.router.Group("/api/v1")
	api.GET("/health", h.Health)
	api.GET("/about", h.About)
	api.POST("/auth/login", h.Login)

	auth := api.Group("")
	auth.Use(h.RequireAuth())
	auth.POST("/auth/logout", h.Logout)
	auth.GET("/auth/me", h.Me)
	auth.PUT("/auth/password", h.UpdatePassword)
}
