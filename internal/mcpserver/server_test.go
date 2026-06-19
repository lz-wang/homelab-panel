package mcpserver

import (
	"path/filepath"
	"testing"

	"homelab-panel/internal/data"
	"homelab-panel/internal/panel"
)

func newTestService(t *testing.T) *panel.Service {
	t.Helper()
	store, _, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	return panel.NewService(store)
}

// TestNewServerRegistersTools ensures AddTool schema inference does not panic
// during server construction. NewServer runs at process startup, so a panic
// here would crash the whole service.
func TestNewServerRegistersTools(t *testing.T) {
	svc := newTestService(t)
	s := NewServer(svc, ServerOptions{Version: "test"})
	if s == nil {
		t.Fatal("nil server")
	}
}
