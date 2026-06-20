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
	GoMod   string
}

type Handler struct {
	Store   *data.Store
	DataDir string
	Version string
	WebFS   fs.FS
	GoMod   string
	tokens  *TokenManager
}

func NewHandler(deps Deps) *Handler {
	return &Handler{
		Store:   deps.Store,
		DataDir: deps.DataDir,
		Version: deps.Version,
		WebFS:   deps.WebFS,
		GoMod:   deps.GoMod,
		tokens:  NewTokenManager(deps.Store, 30*24*time.Hour),
	}
}
