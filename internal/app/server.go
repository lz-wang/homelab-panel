package app

import (
	"context"
	"errors"
	"fmt"
	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"
	"net/http"

	"github.com/gin-gonic/gin"
)

type ServerDeps struct {
	Config Config
	Store  *data.Store
}

type Server struct {
	config Config
	store  *data.Store
	router *gin.Engine
}

func NewServer(deps ServerDeps) *Server {
	router := gin.New()
	router.Use(gin.Recovery())

	server := &Server{
		config: deps.Config,
		store:  deps.Store,
		router: router,
	}
	server.registerRoutes()

	return server
}

func (s *Server) Run(ctx context.Context) error {
	httpServer := &http.Server{
		Addr:    s.config.address(),
		Handler: s.router,
	}

	errCh := make(chan error, 1)
	go func() {
		logging.Infof("starting server on %s", httpServer.Addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		if err := httpServer.Shutdown(context.Background()); err != nil {
			return fmt.Errorf("shutdown server: %w", err)
		}
		return ctx.Err()
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("run server: %w", err)
		}
		return nil
	}
}
