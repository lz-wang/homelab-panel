package logger

import (
	"os"
	"path/filepath"
	"sun-panel/internal/app/global"
	"sun-panel/internal/app/lib/cmn"

	"go.uber.org/zap"
)

const (
	logDir  = "logs"
	logFile = "homelab-panel.log"
)

func InitRunlog(runmode string) (*zap.SugaredLogger, error) {
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, err
	}

	var level zap.AtomicLevel
	if runmode == "debug" {
		level = zap.NewAtomicLevelAt(zap.DebugLevel)
	} else {
		level = global.LoggerLevel
	}

	logger := cmn.InitLogger(filepath.Join(logDir, logFile), level)
	return logger, nil
}
