package app

import (
	"context"
	"fmt"
	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

type App struct {
	config   Config
	server   *Server
	password string
}

func New(config Config) (*App, error) {
	gin.SetMode(gin.ReleaseMode)

	dataDir := config.dataDir()
	if err := os.MkdirAll(filepath.Join(dataDir, "uploads"), 0o755); err != nil {
		return nil, fmt.Errorf("create data directories: %w", err)
	}

	store, password, err := data.Open(filepath.Join(dataDir, "homelab-panel.json"))
	if err != nil {
		return nil, err
	}
	if err := store.EnsureSecret(); err != nil {
		return nil, fmt.Errorf("ensure auth secret: %w", err)
	}
	if password != "" {
		logging.Infof("admin password generated on first run")
		fmt.Println("========================================")
		fmt.Println("First run: an admin password has been generated (shown only once)")
		fmt.Printf("Password: %s\n", password)
		fmt.Println("Keep it safe. You can change it in Settings after signing in.")
		fmt.Println("========================================")
	}

	server := NewServer(ServerDeps{
		Config: config,
		Store:  store,
	})

	return &App{
		config:   config,
		server:   server,
		password: password,
	}, nil
}

func Run(ctx context.Context, config Config) error {
	app, err := New(config)
	if err != nil {
		return err
	}
	defer func() {
		_ = logging.Sync()
	}()

	return app.server.Run(ctx)
}
