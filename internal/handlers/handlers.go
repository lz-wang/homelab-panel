package handlers

import (
	"io/fs"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type Deps struct {
	DB      *gorm.DB
	Logger  *zap.Logger
	DataDir string
	Version string
	WebFS   fs.FS
}

type Handler struct {
	DB      *gorm.DB
	Logger  *zap.Logger
	DataDir string
	Version string
	WebFS   fs.FS
}

func NewHandler(deps Deps) *Handler {
	return &Handler{
		DB:      deps.DB,
		Logger:  deps.Logger,
		DataDir: deps.DataDir,
		Version: deps.Version,
		WebFS:   deps.WebFS,
	}
}
