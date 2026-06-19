package app

import (
	"context"
	"fmt"
	"homelab-panel/internal/data"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type App struct {
	config   Config
	logger   *zap.Logger
	server   *Server
	password string
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

	store, password, err := data.Open(filepath.Join(dataDir, "homelab-panel.json"), logger)
	if err != nil {
		return nil, err
	}
	if err := store.EnsureSecret(); err != nil {
		return nil, fmt.Errorf("ensure auth secret: %w", err)
	}
	if password != "" {
		fmt.Println("========================================")
		fmt.Println("首次启动：已生成管理员密码（仅显示一次）")
		fmt.Printf("密码：%s\n", password)
		fmt.Println("请妥善保存，登录后可在设置中修改。")
		fmt.Println("========================================")
	}

	server := NewServer(ServerDeps{
		Config: config,
		Logger: logger,
		Store:  store,
	})

	return &App{
		config:   config,
		logger:   logger,
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
		_ = app.logger.Sync()
	}()

	return app.server.Run(ctx)
}
