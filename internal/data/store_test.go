package data

import (
	"path/filepath"
	"testing"
)

func TestOpenFirstRunCreatesFileAndPassword(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")

	store, password, err := Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if password == "" {
		t.Fatal("expected first-run password, got empty")
	}
	if !store.CheckPassword(password) {
		t.Fatal("first-run password should verify")
	}
	if store.CheckPassword("wrong") {
		t.Fatal("wrong password should not verify")
	}

	again, pw2, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if pw2 != "" {
		t.Fatalf("reopen should not return a password, got %q", pw2)
	}
	if !again.CheckPassword(password) {
		t.Fatal("persisted password should still verify after reopen")
	}
}

func TestSaveAtomicAndVisible(t *testing.T) {
	dir := t.TempDir()
	store, _, err := Open(filepath.Join(dir, "homelab-panel.json"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	err = store.Save(func(d *StoreData) error {
		d.Panel.SiteName = "My Lab"
		d.Panel.Groups = append(d.Panel.Groups, Group{Name: "g1"})
		return nil
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}

	snap := store.Snapshot()
	if snap.Panel.SiteName != "My Lab" {
		t.Fatalf("siteName = %q", snap.Panel.SiteName)
	}
	if len(snap.Panel.Groups) != 1 {
		t.Fatalf("groups = %d", len(snap.Panel.Groups))
	}

	reopened, _, _ := Open(filepath.Join(dir, "homelab-panel.json"))
	if reopened.Snapshot().Panel.SiteName != "My Lab" {
		t.Fatal("save should be persisted to disk")
	}
}

func TestSaveRollbackOnError(t *testing.T) {
	dir := t.TempDir()
	store, _, _ := Open(filepath.Join(dir, "homelab-panel.json"))

	err := store.Save(func(d *StoreData) error {
		d.Panel.SiteName = "should not persist"
		return assertErr
	})
	if err != assertErr {
		t.Fatalf("expected assertErr, got %v", err)
	}
	if store.Snapshot().Panel.SiteName == "should not persist" {
		t.Fatal("failed Save must not mutate in-memory state")
	}
}

func TestUpdatePassword(t *testing.T) {
	dir := t.TempDir()
	store, initial, _ := Open(filepath.Join(dir, "homelab-panel.json"))

	if err := store.UpdatePassword("wrong", "newpass"); err != ErrInvalidPassword {
		t.Fatalf("expected ErrInvalidPassword, got %v", err)
	}
	if err := store.UpdatePassword(initial, "newpass"); err != nil {
		t.Fatalf("update: %v", err)
	}
	if !store.CheckPassword("newpass") {
		t.Fatal("new password should verify")
	}
}

func TestResetPassword(t *testing.T) {
	dir := t.TempDir()
	store, initial, _ := Open(filepath.Join(dir, "homelab-panel.json"))

	// reset 不需要旧密码即可生效
	if err := store.ResetPassword("brand-new"); err != nil {
		t.Fatalf("reset: %v", err)
	}
	if !store.CheckPassword("brand-new") {
		t.Fatal("reset password should verify")
	}
	if store.CheckPassword(initial) {
		t.Fatal("old password should no longer verify after reset")
	}

	// reset 应持久化到磁盘
	reopened, _, _ := Open(filepath.Join(dir, "homelab-panel.json"))
	if !reopened.CheckPassword("brand-new") {
		t.Fatal("reset password should be persisted to disk")
	}
}

func TestOpenReopenPreservesData(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")

	// 首次 Open 初始化数据文件并返回首启密码
	_, firstPw, err := Open(path)
	if err != nil {
		t.Fatalf("first open: %v", err)
	}
	if firstPw == "" {
		t.Fatal("expected first-run password")
	}
	// 再次 Open：已有数据文件，不应重置、不返回密码
	again, againPw, err := Open(path)
	if err != nil {
		t.Fatalf("second open: %v", err)
	}
	if againPw != "" {
		t.Fatalf("reopen should not reset, got password %q", againPw)
	}
	// 数据应保持（同一个 admin hash）
	if !again.CheckPassword(firstPw) {
		t.Fatal("reopen should preserve password")
	}
}

func TestEnsureSecretGeneratesAndPersists(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")
	store, _, _ := Open(path)

	if store.Secret() != "" {
		t.Fatal("secret should be empty before EnsureSecret")
	}
	if err := store.EnsureSecret(); err != nil {
		t.Fatalf("ensure: %v", err)
	}
	first := store.Secret()
	if first == "" {
		t.Fatal("secret should be generated after EnsureSecret")
	}
	// 幂等：再次调用不改变密钥
	if err := store.EnsureSecret(); err != nil {
		t.Fatalf("ensure again: %v", err)
	}
	if store.Secret() != first {
		t.Fatal("EnsureSecret should be idempotent")
	}
	// 持久化到磁盘
	reopened, _, _ := Open(path)
	if reopened.Secret() != first {
		t.Fatal("secret should persist to disk")
	}
}

func TestIncrementTokenVersionPersists(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")
	store, _, _ := Open(path)

	if v := store.TokenVersion(); v != 0 {
		t.Fatalf("initial version = %d, want 0", v)
	}
	if err := store.IncrementTokenVersion(); err != nil {
		t.Fatalf("increment: %v", err)
	}
	if v := store.TokenVersion(); v != 1 {
		t.Fatalf("version = %d, want 1", v)
	}
	reopened, _, _ := Open(path)
	if v := reopened.TokenVersion(); v != 1 {
		t.Fatalf("persisted version = %d, want 1", v)
	}
}

var assertErr = errSentinel("sentinel")

type errSentinel string

func (e errSentinel) Error() string { return string(e) }
