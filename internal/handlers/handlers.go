package handlers

import (
	"io/fs"
	"time"

	"homelab-panel/internal/data"

	"go.uber.org/zap"
)

type Deps struct {
	Store   *data.Store
	Logger  *zap.Logger
	DataDir string
	Version string
	WebFS   fs.FS
}

type Handler struct {
	Store   *data.Store
	Logger  *zap.Logger
	DataDir string
	Version string
	WebFS   fs.FS
	tokens  *TokenManager
}

func NewHandler(deps Deps) *Handler {
	return &Handler{
		Store:   deps.Store,
		Logger:  deps.Logger,
		DataDir: deps.DataDir,
		Version: deps.Version,
		WebFS:   deps.WebFS,
		tokens:  NewTokenManager(7 * 24 * time.Hour),
	}
}
