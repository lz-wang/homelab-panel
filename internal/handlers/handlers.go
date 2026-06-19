package handlers

import (
	"io/fs"
	"time"

	"homelab-panel/internal/data"
)

type Deps struct {
	Store   *data.Store
	DataDir string
	Version string
	WebFS   fs.FS
}

type Handler struct {
	Store   *data.Store
	DataDir string
	Version string
	WebFS   fs.FS
	tokens  *TokenManager
}

func NewHandler(deps Deps) *Handler {
	return &Handler{
		Store:   deps.Store,
		DataDir: deps.DataDir,
		Version: deps.Version,
		WebFS:   deps.WebFS,
		tokens:  NewTokenManager(deps.Store, 30*24*time.Hour),
	}
}
