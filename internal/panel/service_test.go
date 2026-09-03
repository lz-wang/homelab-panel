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
			{ID: 10, GroupID: 1, Title: "Proxmox", URL: "https://pve", BackupURL: "https://pve-mirror", Description: "virtualization", Sort: 1, Icon: &data.ItemIcon{Text: "mdi:server"}, CreatedAt: now, UpdatedAt: now},
			{ID: 11, GroupID: 1, Title: "Grafana", URL: "https://grafana", Sort: 2, Icon: &data.ItemIcon{}, CreatedAt: now, UpdatedAt: now},
			{ID: 20, GroupID: 2, Title: "Jellyfin", URL: "https://jf", Sort: 1, Icon: &data.ItemIcon{}, CreatedAt: now, UpdatedAt: now},
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

	// 匹配 backup_url。
	items, _ = svc.SearchApps(ctx, "mirror", false, 0)
	if len(items) != 1 || items[0].Title != "Proxmox" {
		t.Fatalf("search backup_url = %v", items)
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
	if app.BackupURL != "https://pve-mirror" {
		t.Errorf("backup_url = %q, want https://pve-mirror", app.BackupURL)
	}

	if _, err := svc.GetApp(ctx, 999); !errors.Is(err, ErrAppNotFound) {
		t.Errorf("missing app err = %v, want ErrAppNotFound", err)
	}
}

func TestCreateApp(t *testing.T) {
	store := seedStore(t)
	svc := NewService(store)
	ctx := context.Background()

	created, err := svc.CreateApp(ctx, AppInput{GroupID: 1, Title: "NewApp", URL: "https://new", BackupURL: "https://new-bak"})
	if err != nil {
		t.Fatalf("CreateApp: %v", err)
	}
	if created.ID == 0 {
		t.Error("server must allocate a non-zero id")
	}
	if created.BackupURL != "https://new-bak" {
		t.Errorf("created backup_url = %q, want https://new-bak", created.BackupURL)
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

	// 设置 backup_url。
	bak := "https://bak"
	patched, err = svc.PatchApp(ctx, 10, AppPatch{BackupURL: &bak})
	if err != nil {
		t.Fatalf("PatchApp backup_url: %v", err)
	}
	if patched.BackupURL != "https://bak" {
		t.Errorf("backup_url = %q, want https://bak", patched.BackupURL)
	}

	// 清空 backup_url。
	emptyBak := ""
	patched, err = svc.PatchApp(ctx, 10, AppPatch{BackupURL: &emptyBak})
	if err != nil {
		t.Fatalf("PatchApp clear backup_url: %v", err)
	}
	if patched.BackupURL != "" {
		t.Errorf("backup_url should be cleared: %q", patched.BackupURL)
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

	replaced, err := svc.ReplaceApp(ctx, 10, AppInput{GroupID: 1, Title: "PVE", URL: "https://pve2", BackupURL: "https://pve2-bak"})
	if err != nil {
		t.Fatalf("ReplaceApp: %v", err)
	}
	if replaced.Title != "PVE" || replaced.URL != "https://pve2" {
		t.Errorf("replaced = %+v", replaced)
	}
	if replaced.BackupURL != "https://pve2-bak" {
		t.Errorf("replaced backup_url = %q, want https://pve2-bak", replaced.BackupURL)
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

func TestCreateGroup(t *testing.T) {
	store := seedStore(t)
	svc := NewService(store)
	ctx := context.Background()

	// 追加到末尾：sort = max(2)+1 = 3，id 由服务端分配。
	created, err := svc.CreateGroup(ctx, GroupInput{Name: "Network"})
	if err != nil {
		t.Fatalf("CreateGroup: %v", err)
	}
	if created.ID == 0 {
		t.Error("server must allocate a non-zero id")
	}
	if created.Sort != 3 {
		t.Errorf("append sort = %d, want 3", created.Sort)
	}
	if groupNameByID(store.Snapshot(), created.ID) != "Network" {
		t.Error("created group not persisted")
	}

	// 显式 sort 被保留。
	g, err := svc.CreateGroup(ctx, GroupInput{Name: "Pinned", Sort: 7})
	if err != nil {
		t.Fatalf("CreateGroup explicit sort: %v", err)
	}
	if g.Sort != 7 {
		t.Errorf("explicit sort = %d, want 7", g.Sort)
	}

	// 缺 name 报错。
	if _, err := svc.CreateGroup(ctx, GroupInput{Name: ""}); err == nil {
		t.Error("empty name should error")
	}
	// 负 sort 报错。
	if _, err := svc.CreateGroup(ctx, GroupInput{Name: "X", Sort: -1}); err == nil {
		t.Error("negative sort should error")
	}
}

func TestCreateAppIconColors(t *testing.T) {
	svc := NewService(seedStore(t))
	ctx := context.Background()

	// 合法预设色（含小写）通过。
	if _, err := svc.CreateApp(ctx, AppInput{
		GroupID: 1, Title: "Ok", URL: "https://x",
		Icon: AppIcon{Text: "mdi:server", Color: "#ffffff", BackgroundColor: "#2196f3"},
	}); err != nil {
		t.Fatalf("valid preset colors should pass: %v", err)
	}

	// 非零图标缺 text 报错。
	if _, err := svc.CreateApp(ctx, AppInput{
		GroupID: 1, Title: "Bad", URL: "https://x",
		Icon: AppIcon{Color: "#ffffff"},
	}); err == nil {
		t.Error("icon without text should error")
	}

	// 非法文字色（非白/黑）报错。
	if _, err := svc.CreateApp(ctx, AppInput{
		GroupID: 1, Title: "Bad", URL: "https://x",
		Icon: AppIcon{Text: "mdi:server", Color: "#FF0000"},
	}); err == nil {
		t.Error("non preset text color should error")
	}

	// 非法背景色（red 300 属「更多」色阶，非快选预设）报错。
	if _, err := svc.CreateApp(ctx, AppInput{
		GroupID: 1, Title: "Bad", URL: "https://x",
		Icon: AppIcon{Text: "mdi:server", BackgroundColor: "#E57373"},
	}); err == nil {
		t.Error("non preset background color should error")
	}
}

func groupNameByID(snap data.StoreData, id int) string {
	for _, g := range snap.Panel.Groups {
		if g.ID == id {
			return g.Name
		}
	}
	return ""
}

func appTitleByID(snap data.StoreData, id int) string {
	for _, it := range snap.Panel.Items {
		if it.ID == id {
			return it.Title
		}
	}
	return ""
}
