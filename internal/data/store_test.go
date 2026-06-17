package data

import (
	"path/filepath"
	"testing"

	"go.uber.org/zap"
)

func newTestLogger(t *testing.T) *zap.Logger {
	t.Helper()
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("create logger: %v", err)
	}
	return logger
}

func TestOpenFirstRunCreatesFileAndPassword(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")

	store, password, err := Open(path, newTestLogger(t))
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

	again, pw2, err := Open(path, newTestLogger(t))
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
	store, _, err := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))
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

	reopened, _, _ := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))
	if reopened.Snapshot().Panel.SiteName != "My Lab" {
		t.Fatal("save should be persisted to disk")
	}
}

func TestSaveRollbackOnError(t *testing.T) {
	dir := t.TempDir()
	store, _, _ := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))

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
	store, initial, _ := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))

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

var assertErr = errSentinel("sentinel")

type errSentinel string

func (e errSentinel) Error() string { return string(e) }
