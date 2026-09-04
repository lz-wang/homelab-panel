package mcpserver

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"homelab-panel/internal/data"
	"homelab-panel/internal/panel"
)

// bearerRT 给每个请求注入 MCP bearer token 头。
type bearerRT struct {
	token string
	base  http.RoundTripper
}

func (r *bearerRT) RoundTrip(req *http.Request) (*http.Response, error) {
	req = req.Clone(req.Context())
	req.Header.Set("Authorization", "Bearer "+r.token)
	return r.base.RoundTrip(req)
}

// newMCPTestServer 构造一个内嵌 token 鉴权的 httptest MCP 服务，并预置一个分组与应用。
func newMCPTestServer(t *testing.T) (*data.Store, *httptest.Server, string) {
	t.Helper()
	store := newTestStore(t)

	now := time.Now()
	if err := store.Save(func(d *data.StoreData) error {
		d.Panel.Groups = []data.Group{{ID: 1, Name: "Infra", Sort: 1, CreatedAt: now, UpdatedAt: now}}
		d.Panel.Items = []data.Item{{
			ID: 10, GroupID: 1, Title: "Proxmox", URL: "https://pve.local",
			Sort: 1, CreatedAt: now, UpdatedAt: now,
		}}
		d.Files = []data.File{{ID: 1, OriginalName: "wallpaper.jpg", MimeType: "image/jpeg", Size: 42, URL: "/uploads/wallpaper.jpg", CreatedAt: now}}
		d.NextID = data.NextID{Group: 2, Item: 11, File: 1}
		return nil
	}); err != nil {
		t.Fatalf("seed panel: %v", err)
	}

	plain, prefix, hash, err := GenerateToken()
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	if err := store.Save(func(d *data.StoreData) error {
		d.MCP.Enabled = true
		d.MCP.Tokens = []data.MCPToken{{Prefix: prefix, Hash: hash}}
		return nil
	}); err != nil {
		t.Fatalf("seed mcp: %v", err)
	}

	svc := panel.NewService(store)
	handler := NewHTTPHandler(svc, ServerOptions{Version: "test"})
	srv := httptest.NewServer(AuthMiddleware(store, handler))
	t.Cleanup(srv.Close)

	return store, srv, plain
}

func addMCPToken(t *testing.T, store *data.Store, scope string) string {
	t.Helper()
	plain, prefix, hash, err := GenerateToken()
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Save(func(d *data.StoreData) error {
		d.MCP.Tokens = append(d.MCP.Tokens, data.MCPToken{Prefix: prefix, Hash: hash, Scope: scope})
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	return plain
}

func connectMCP(t *testing.T, url, token string) *mcp.ClientSession {
	t.Helper()
	transport := &mcp.StreamableClientTransport{
		Endpoint:             url,
		HTTPClient:           &http.Client{Transport: &bearerRT{token: token, base: http.DefaultTransport}},
		DisableStandaloneSSE: true,
	}
	client := mcp.NewClient(&mcp.Implementation{Name: "test-client", Version: "test"}, nil)
	sess, err := client.Connect(context.Background(), transport, nil)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { _ = sess.Close() })
	return sess
}

func contentText(res *mcp.CallToolResult) string {
	var b strings.Builder
	for _, c := range res.Content {
		if tc, ok := c.(*mcp.TextContent); ok {
			b.WriteString(tc.Text)
		}
	}
	return b.String()
}

func structuredMap(t *testing.T, res *mcp.CallToolResult) map[string]any {
	t.Helper()
	if res.IsError {
		t.Fatalf("unexpected tool error: %s", contentText(res))
	}
	m, ok := res.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("StructuredContent is not a map: %T", res.StructuredContent)
	}
	return m
}

func callTool(t *testing.T, sess *mcp.ClientSession, name string, args map[string]any) *mcp.CallToolResult {
	t.Helper()
	res, err := sess.CallTool(context.Background(), &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("CallTool(%s): %v", name, err)
	}
	return res
}

func TestMCPReadTools(t *testing.T) {
	_, srv, token := newMCPTestServer(t)
	sess := connectMCP(t, srv.URL, token)
	ctx := context.Background()

	tools, err := sess.ListTools(ctx, &mcp.ListToolsParams{})
	if err != nil {
		t.Fatalf("ListTools: %v", err)
	}
	if len(tools.Tools) != 15 {
		t.Errorf("tools count = %d, want 15", len(tools.Tools))
	}

	// get_panel：一次获取完整状态。
	res := callTool(t, sess, "homelab_panel_get_panel", nil)
	snapshot := structuredMap(t, res)["panel"].(map[string]any)
	if snapshot["site_name"] == nil || len(snapshot["apps"].([]any)) != 1 {
		t.Errorf("panel snapshot = %v", snapshot)
	}

	// list_groups：不含应用。
	res = callTool(t, sess, "homelab_panel_list_groups", nil)
	groups := structuredMap(t, res)["groups"].([]any)
	if len(groups) != 1 {
		t.Fatalf("groups = %d, want 1", len(groups))
	}
	if name := groups[0].(map[string]any)["name"]; name != "Infra" {
		t.Errorf("group name = %v, want Infra", name)
	}

	// search_apps：按子串匹配。
	res = callTool(t, sess, "homelab_panel_search_apps", map[string]any{"pattern": "prox"})
	items := structuredMap(t, res)["items"].([]any)
	if len(items) != 1 {
		t.Fatalf("search items = %d, want 1", len(items))
	}

	// get_app。
	res = callTool(t, sess, "homelab_panel_get_app", map[string]any{"id": 10})
	item := structuredMap(t, res)["item"].(map[string]any)
	if item["title"] != "Proxmox" {
		t.Errorf("get_app title = %v, want Proxmox", item["title"])
	}

	// get_app 不存在 → tool error。
	res = callTool(t, sess, "homelab_panel_get_app", map[string]any{"id": 999})
	if !res.IsError {
		t.Error("get_app on missing id should be a tool error")
	}

	// search pattern 过长 → tool error。
	long := strings.Repeat("a", 300)
	res = callTool(t, sess, "homelab_panel_search_apps", map[string]any{"pattern": long})
	if !res.IsError {
		t.Error("oversized pattern should be a tool error")
	}

	res = callTool(t, sess, "homelab_panel_list_files", nil)
	files := structuredMap(t, res)["files"].([]any)
	if len(files) != 1 || files[0].(map[string]any)["url"] != "/uploads/wallpaper.jpg" {
		t.Errorf("files = %v", files)
	}
}

func TestMCPScopeToolDiscovery(t *testing.T) {
	store, srv, writeToken := newMCPTestServer(t)
	readToken := addMCPToken(t, store, data.MCPTokenScopeRead)
	readTools, err := connectMCP(t, srv.URL, readToken).ListTools(context.Background(), &mcp.ListToolsParams{})
	if err != nil || len(readTools.Tools) != 6 {
		t.Fatalf("read tools=%d err=%v", len(readTools.Tools), err)
	}
	for _, tool := range readTools.Tools {
		if tool.Name == "homelab_panel_delete_app" {
			t.Fatal("read scope exposed delete_app")
		}
	}
	writeTools, err := connectMCP(t, srv.URL, writeToken).ListTools(context.Background(), &mcp.ListToolsParams{})
	if err != nil || len(writeTools.Tools) != 15 {
		t.Fatalf("write tools=%d err=%v", len(writeTools.Tools), err)
	}
}

func TestMCPWriteFlow(t *testing.T) {
	store, srv, token := newMCPTestServer(t)
	sess := connectMCP(t, srv.URL, token)

	// patch_app：只改传入字段。
	res := callTool(t, sess, "homelab_panel_patch_app", map[string]any{"id": 10, "title": "Proxmox VE"})
	item := structuredMap(t, res)["item"].(map[string]any)
	if item["title"] != "Proxmox VE" {
		t.Errorf("patched title = %v, want 'Proxmox VE'", item["title"])
	}
	if item["url"] != "https://pve.local" {
		t.Errorf("url should be unchanged: %v", item["url"])
	}
	snap := store.Snapshot()
	if appTitleByID(snap, 10) != "Proxmox VE" {
		t.Errorf("store not updated, title=%q", appTitleByID(snap, 10))
	}

	// create_app：服务端分配 id。
	res = callTool(t, sess, "homelab_panel_create_app", map[string]any{
		"group_id": 1, "title": "Grafana", "url": "https://grafana.local",
	})
	item = structuredMap(t, res)["item"].(map[string]any)
	newID, ok := item["id"].(float64)
	if !ok || newID == 0 {
		t.Fatalf("created app id not allocated: %v", item["id"])
	}
	snap = store.Snapshot()
	if appTitleByID(snap, int(newID)) != "Grafana" {
		t.Errorf("created app not persisted with title Grafana: %q", appTitleByID(snap, int(newID)))
	}

	// patch_group。
	res = callTool(t, sess, "homelab_panel_patch_group", map[string]any{"group_id": 1, "name": "Infrastructure", "icon": "mdi:server-network"})
	group := structuredMap(t, res)["group"].(map[string]any)
	if group["name"] != "Infrastructure" {
		t.Errorf("patched group = %v", group["name"])
	}

	// create_group：服务端分配 id，sort 追加到末尾。
	res = callTool(t, sess, "homelab_panel_create_group", map[string]any{"name": "Network", "icon": "mdi:network"})
	group = structuredMap(t, res)["group"].(map[string]any)
	newGroupID, ok := group["id"].(float64)
	if !ok || newGroupID == 0 {
		t.Fatalf("created group id not allocated: %v", group["id"])
	}
	if group["sort"].(float64) != 2 { // 种子里仅 1 个分组 sort=1
		t.Errorf("append sort = %v, want 2", group["sort"])
	}

	// create_app 非法背景色 → tool error（禁止非预设色）。
	res = callTool(t, sess, "homelab_panel_create_app", map[string]any{
		"group_id": 1, "title": "Bad", "url": "https://x",
		"icon": map[string]any{"background_color": "#E57373"},
	})
	if !res.IsError {
		t.Error("non preset background color should be a tool error")
	}

	// delete_app。
	res = callTool(t, sess, "homelab_panel_delete_app", map[string]any{"id": 10})
	if res.IsError {
		t.Errorf("delete app: %s", contentText(res))
	}
	if appTitleByID(store.Snapshot(), 10) != "" {
		t.Error("app should be deleted")
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
