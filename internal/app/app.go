package app

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type App struct {
	config Config
	logger *zap.Logger
	server *Server
}

func New(config Config) (*App, error) {
	gin.SetMode(gin.ReleaseMode)

	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("create logger: %w", err)
	}

	dataDir := config.dataDir()
	if err := os.MkdirAll(filepath.Join(dataDir, "uploads"), 0o755); err != nil {
		return nil, fmt.Errorf("create data directories: %w", err)
	}

	server := NewServer(ServerDeps{
		Config: config,
		Logger: logger,
	})

	return &App{
		config: config,
		logger: logger,
		server: server,
	}, nil
}

func Run(ctx context.Context, config Config) error {
	app, err := New(config)
	if err != nil {
		return err
	}
	defer func() {
		_ = app.logger.Sync()
	}()

	return app.server.Run(ctx)
}
