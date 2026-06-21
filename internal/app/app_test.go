package app

import (
	"os"
	"testing"
)

// TestNewCreatesApp 覆盖 app.New 的装配路径（MkdirAll → data.Open → EnsureSecret →
// NewServer → registerRoutes），并验证首运行生成密码、再次打开不重复生成。
func TestNewCreatesApp(t *testing.T) {
	dir := t.TempDir()

	app, err := New(Config{DataDir: dir})
	if err != nil {
		t.Fatalf("first New: %v", err)
	}
	if app == nil || app.server == nil {
		t.Fatal("expected app with initialized server")
	}
	if app.password == "" {
		t.Error("first run should generate a password")
	}

	// second New on the same dir → store already exists, no new password
	app2, err := New(Config{DataDir: dir})
	if err != nil {
		t.Fatalf("second New: %v", err)
	}
	if app2.password != "" {
		t.Error("existing store should not regenerate password")
	}
}

// TestNewFailsOnUnwritableDataDir 覆盖 MkdirAll 失败的错误返回。
func TestNewFailsOnUnwritableDataDir(t *testing.T) {
	// 使用一个已存在的文件路径作为 DataDir，MkdirAll(.../uploads) 必然失败
	dir := t.TempDir()
	file := dir + "/blocker"
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := New(Config{DataDir: file}); err == nil {
		t.Fatal("expected New to fail when data dir is not writable")
	}
}
