package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadUsesDefaultsWithoutConfigFile(t *testing.T) {
	cfg, err := Load(t.TempDir())
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if got := cfg.GetValueString("base", "http_port"); got != "3002" {
		t.Fatalf("http_port = %q, want %q", got, "3002")
	}
	if got := cfg.GetValueString("sqlite", "file_path"); got != "./data.db" {
		t.Fatalf("sqlite file_path = %q, want %q", got, "./data.db")
	}
}

func TestLoadMergesYamlDotEnvAndProcessEnv(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, ConfigFileName), []byte(`base:
  http_port: "3100"
sqlite:
  file_path: ./from-yaml.db
`), 0644); err != nil {
		t.Fatalf("write config.yaml: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, DotEnvFileName), []byte("SQLITE_FILE_PATH=./from-env.db\n"), 0644); err != nil {
		t.Fatalf("write .env: %v", err)
	}
	t.Setenv("HOMELAB_PANEL_BASE_HTTP_PORT", "3200")

	cfg, err := Load(dir)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if got := cfg.GetValueString("base", "http_port"); got != "3200" {
		t.Fatalf("http_port = %q, want %q", got, "3200")
	}
	if got := cfg.GetValueString("sqlite", "file_path"); got != "./from-env.db" {
		t.Fatalf("sqlite file_path = %q, want %q", got, "./from-env.db")
	}
}
