package handlers

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCleanupWrittenFiles(t *testing.T) {
	h := newFilesHandler(t)
	uploadsDir := filepath.Join(h.DataDir, "uploads")
	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		t.Fatal(err)
	}

	// create a file that cleanup should remove
	p := filepath.Join(uploadsDir, "abc.png")
	if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	cleanupWrittenFiles(h.DataDir, []writtenFile{{objectKey: "abc.png"}})
	if _, err := os.Stat(p); !os.IsNotExist(err) {
		t.Errorf("expected file removed, got stat err=%v", err)
	}

	// removing a non-existent file is a no-op (errors swallowed internally)
	cleanupWrittenFiles(h.DataDir, []writtenFile{{objectKey: "missing.png"}})
}
