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
	auth.GET("/me/config", h.GetUserConfig)
	auth.PUT("/me/config", h.UpdateUserConfig)
	auth.GET("/groups", h.ListGroups)
	auth.POST("/groups", h.CreateGroup)
	auth.GET("/groups/:id", h.GetGroup)
	auth.PATCH("/groups/:id", h.UpdateGroup)
	auth.DELETE("/groups/:id", h.DeleteGroup)
	auth.PUT("/groups/order", h.UpdateGroupOrder)
	auth.GET("/items", h.ListItems)
	auth.POST("/items", h.CreateItem)
	auth.GET("/items/:id", h.GetItem)
	auth.PATCH("/items/:id", h.UpdateItem)
	auth.DELETE("/items/:id", h.DeleteItem)
	auth.PUT("/items/order", h.UpdateItemOrder)
	auth.POST("/items/batch", h.CreateItems)

	api.GET("/public/home", h.PublicHome)
}
