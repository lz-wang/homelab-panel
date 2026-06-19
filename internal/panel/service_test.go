package panel

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"homelab-panel/internal/data"
)

func seedStore(t *testing.T) *data.Store {
	t.Helper()
	store, _, err := data.Open(filepath.Join(t.TempDir(), "test.json"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	now := time.Now()
	if err := store.Save(func(d *data.StoreData) error {
		d.Panel.Groups = []data.Group{
			{ID: 1, Name: "Infra", Sort: 1, CreatedAt: now, UpdatedAt: now},
			{ID: 2, Name: "Media", Sort: 2, CreatedAt: now, UpdatedAt: now},
		}
		d.Panel.Items = []data.Item{
			{ID: 10, GroupID: 1, Title: "Proxmox", URL: "https://pve", Description: "virtualization", Sort: 1, Icon: &data.ItemIcon{Text: "mdi:server"}, OpenMethod: "new_tab", CreatedAt: now, UpdatedAt: now},
			{ID: 11, GroupID: 1, Title: "Grafana", URL: "https://grafana", Sort: 2, Icon: &data.ItemIcon{}, OpenMethod: "new_tab", CreatedAt: now, UpdatedAt: now},
			{ID: 20, GroupID: 2, Title: "Jellyfin", URL: "https://jf", Sort: 1, Icon: &data.ItemIcon{}, OpenMethod: "new_tab", CreatedAt: now, UpdatedAt: now},
		}
		d.NextID = data.NextID{Group: 3, Item: 21, File: 1}
		return nil
	}); err != nil {
		t.Fatalf("seed: %v", err)
	}
	return store
}

func TestListGroups(t *testing.T) {
	svc := NewService(seedStore(t))
	groups, err := svc.ListGroups(context.Background())
	if err != nil {
		t.Fatalf("ListGroups: %v", err)
	}
	if len(groups) != 2 {
		t.Fatalf("groups = %d, want 2", len(groups))
	}
	for _, g := range groups {
		if g.Name == "" {
			t.Error("group summary leaked app data: lists must not include apps")
		}
	}
}

func TestListAppsByGroup(t *testing.T) {
	svc := NewService(seedStore(t))

	items, err := svc.ListAppsByGroup(context.Background(), 1)
	if err != nil {
		t.Fatalf("ListAppsByGroup: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("items = %d, want 2 (only group 1)", len(items))
	}
	for _, it := range items {
		if it.GroupID != 1 {
			t.Errorf("item group = %d, want 1", it.GroupID)
		}
	}

	if _, err := svc.ListAppsByGroup(context.Background(), 999); !errors.Is(err, ErrGroupNotFound) {
		t.Errorf("missing group err = %v, want ErrGroupNotFound", err)
	}
}

func TestSearchApps(t *testing.T) {
	svc := NewService(seedStore(t))
	ctx := context.Background()

	// 默认大小写不敏感，匹配 title。
	items, err := svc.SearchApps(ctx, "graf", false, 0)
	if err != nil {
		t.Fatalf("SearchApps: %v", err)
	}
	if len(items) != 1 || items[0].Title != "Grafana" {
		t.Fatalf("search graf = %v", items)
	}

	// 匹配 description。
	items, _ = svc.SearchApps(ctx, "virtual", false, 0)
	if len(items) != 1 || items[0].Title != "Proxmox" {
		t.Fatalf("search description = %v", items)
	}

	// 匹配 icon text。
	items, _ = svc.SearchApps(ctx, "server", false, 0)
	if len(items) != 1 || items[0].Title != "Proxmox" {
		t.Fatalf("search icon text = %v", items)
	}

	// limit 截断。
	items, _ = svc.SearchApps(ctx, ".", false, 1)
	if len(items) != 1 {
		t.Fatalf("limit = %d, want 1", len(items))
	}

	// pattern 过长报错。
	long := make([]byte, 300)
	for i := range long {
		long[i] = 'a'
	}
	if _, err := svc.SearchApps(ctx, string(long), false, 0); err == nil {
		t.Error("oversized pattern should error")
	}
}

func TestGetApp(t *testing.T) {
	svc := NewService(seedStore(t))
	ctx := context.Background()

	app, err := svc.GetApp(ctx, 10)
	if err != nil {
		t.Fatalf("GetApp: %v", err)
	}
	if app.Title != "Proxmox" || app.Icon.Text != "mdi:server" {
		t.Errorf("app = %+v", app)
	}

	if _, err := svc.GetApp(ctx, 999); !errors.Is(err, ErrAppNotFound) {
		t.Errorf("missing app err = %v, want ErrAppNotFound", err)
	}
}

func TestCreateApp(t *testing.T) {
	store := seedStore(t)
	svc := NewService(store)
	ctx := context.Background()

	created, err := svc.CreateApp(ctx, AppInput{GroupID: 1, Title: "NewApp", URL: "https://new"})
	if err != nil {
		t.Fatalf("CreateApp: %v", err)
	}
	if created.ID == 0 {
		t.Error("server must allocate a non-zero id")
	}
	if appTitleByID(store.Snapshot(), created.ID) != "NewApp" {
		t.Error("created app not persisted")
	}

	// 缺 title 报错。
	if _, err := svc.CreateApp(ctx, AppInput{GroupID: 1, Title: "", URL: "https://x"}); err == nil {
		t.Error("missing title should error")
	}
	// 分组不存在报错。
	if _, err := svc.CreateApp(ctx, AppInput{GroupID: 999, Title: "X", URL: "https://x"}); !errors.Is(err, ErrGroupNotFound) {
		t.Errorf("missing group err = %v, want ErrGroupNotFound", err)
	}
}

func TestPatchApp(t *testing.T) {
	store := seedStore(t)
	svc := NewService(store)
	ctx := context.Background()

	// 只改传入字段。
	title := "Renamed"
	desc := ""
	patched, err := svc.PatchApp(ctx, 10, AppPatch{Title: &title, Description: &desc})
	if err != nil {
		t.Fatalf("PatchApp: %v", err)
	}
	if patched.Title != "Renamed" {
		t.Errorf("title = %q", patched.Title)
	}
	if patched.Description != "" {
		t.Errorf("description should be cleared: %q", patched.Description)
	}
	if patched.URL != "https://pve" {
		t.Errorf("url should be unchanged: %q", patched.URL)
	}

	// open_method 非法报错。
	bad := "explode"
	if _, err := svc.PatchApp(ctx, 10, AppPatch{OpenMethod: &bad}); err == nil {
		t.Error("invalid open_method should error")
	}

	// 不存在的 app 报错。
	if _, err := svc.PatchApp(ctx, 999, AppPatch{Title: &title}); !errors.Is(err, ErrAppNotFound) {
		t.Errorf("missing app err = %v, want ErrAppNotFound", err)
	}
}

func TestReplaceApp(t *testing.T) {
	store := seedStore(t)
	svc := NewService(store)
	ctx := context.Background()

	replaced, err := svc.ReplaceApp(ctx, 10, AppInput{GroupID: 1, Title: "PVE", URL: "https://pve2"})
	if err != nil {
		t.Fatalf("ReplaceApp: %v", err)
	}
	if replaced.Title != "PVE" || replaced.URL != "https://pve2" {
		t.Errorf("replaced = %+v", replaced)
	}
	if replaced.Description != "" {
		t.Errorf("description should be cleared after full replace: %q", replaced.Description)
	}
}

func TestRenameGroup(t *testing.T) {
	store := seedStore(t)
	svc := NewService(store)
	ctx := context.Background()

	renamed, err := svc.RenameGroup(ctx, 1, "Infrastructure")
	if err != nil {
		t.Fatalf("RenameGroup: %v", err)
	}
	if renamed.Name != "Infrastructure" {
		t.Errorf("name = %q", renamed.Name)
	}

	if _, err := svc.RenameGroup(ctx, 1, ""); err == nil {
		t.Error("empty name should error")
	}
	if _, err := svc.RenameGroup(ctx, 999, "X"); !errors.Is(err, ErrGroupNotFound) {
		t.Errorf("missing group err = %v, want ErrGroupNotFound", err)
	}
}

func appTitleByID(snap data.StoreData, id int) string {
	for _, it := range snap.Panel.Items {
		if it.ID == id {
			return it.Title
		}
	}
	return ""
}
