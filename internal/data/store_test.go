package data

import (
	"encoding/json"
	"os"
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

// TestLegacyIconJSONReadsAndCleansUpOnSave 证明旧版三字段图标数据无需迁移即可升级：
// 手工写入带 item_type/src 的历史 JSON，Open 后 text 正常读出；
// 再 Save 一次，已删除的 item_type/src 字段自然从磁盘文件消失。
func TestLegacyIconJSONReadsAndCleansUpOnSave(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")

	// 先生成一份合法的基线数据文件。
	store, _, err := Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	err = store.Save(func(d *StoreData) error {
		d.Panel.Groups = append(d.Panel.Groups, Group{ID: 1, Name: "g1"})
		d.Panel.Items = append(d.Panel.Items, Item{ID: 1, GroupID: 1, Title: "srv", URL: "https://srv"})
		return nil
	})
	if err != nil {
		t.Fatalf("baseline save: %v", err)
	}

	// 把 items[0] 的 icon 替换为历史格式（含 item_type/src）。
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var doc map[string]any
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	panel := doc["panel"].(map[string]any)
	items := panel["items"].([]any)
	item := items[0].(map[string]any)
	item["icon"] = map[string]any{
		"item_type":        3,
		"src":              "",
		"text":             "mdi:server",
		"color":            "#FFFFFF",
		"background_color": "#2196F3",
	}
	rewritten, err := json.Marshal(doc)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if err := os.WriteFile(path, rewritten, 0o600); err != nil {
		t.Fatalf("write legacy file: %v", err)
	}

	// 旧数据零迁移直接读取。
	legacy, _, err := Open(path)
	if err != nil {
		t.Fatalf("reopen legacy: %v", err)
	}
	icon := legacy.Snapshot().Panel.Items[0].Icon
	if icon == nil || icon.Text != "mdi:server" || icon.Color != "#FFFFFF" {
		t.Fatalf("legacy icon not read back: %+v", icon)
	}

	// 触发一次保存后，历史字段从磁盘消失。
	err = legacy.Save(func(d *StoreData) error { return nil })
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	cleaned, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read cleaned: %v", err)
	}
	var cleanedDoc struct {
		Panel struct {
			Items []struct {
				Icon *struct {
					ItemType        *int   `json:"item_type"`
					Src             string `json:"src"`
					Text            string `json:"text"`
					Color           string `json:"color"`
					BackgroundColor string `json:"background_color"`
				} `json:"icon"`
			} `json:"items"`
		} `json:"panel"`
	}
	if err := json.Unmarshal(cleaned, &cleanedDoc); err != nil {
		t.Fatalf("unmarshal cleaned: %v", err)
	}
	storedIcon := cleanedDoc.Panel.Items[0].Icon
	if storedIcon == nil {
		t.Fatal("icon should still be persisted")
	}
	if storedIcon.ItemType != nil || storedIcon.Src != "" {
		t.Errorf("legacy item_type/src keys should be gone after save, got: %+v", storedIcon)
	}
	if storedIcon.Text != "mdi:server" || storedIcon.Color != "#FFFFFF" || storedIcon.BackgroundColor != "#2196F3" {
		t.Errorf("iconify fields should persist, got: %+v", storedIcon)
	}
}
