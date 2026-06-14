package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type ServerDeps struct {
	Config Config
	Logger *zap.Logger
	DB     *gorm.DB
}

type Server struct {
	config Config
	logger *zap.Logger
	db     *gorm.DB
	router *gin.Engine
}

func NewServer(deps ServerDeps) *Server {
	router := gin.New()
	router.Use(gin.Recovery())

	server := &Server{
		config: deps.Config,
		logger: deps.Logger,
		db:     deps.DB,
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
		s.logger.Info("starting server", zap.String("addr", httpServer.Addr))
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
