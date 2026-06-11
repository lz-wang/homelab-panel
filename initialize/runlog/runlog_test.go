package runlog

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInitRunlogWritesToLogsDirectory(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(wd); err != nil {
			t.Fatalf("restore wd: %v", err)
		}
	})

	if err := os.Chdir(t.TempDir()); err != nil {
		t.Fatalf("chdir temp dir: %v", err)
	}

	logger, err := InitRunlog("debug")
	if err != nil {
		t.Fatalf("InitRunlog() error = %v", err)
	}
	logger.Info("runlog test")
	_ = logger.Sync()

	if _, err := os.Stat(filepath.Join(logDir, logFile)); err != nil {
		t.Fatalf("stat log file: %v", err)
	}
}
