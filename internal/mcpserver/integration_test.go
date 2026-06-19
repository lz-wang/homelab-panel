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
func newMCPTestServer(t *testing.T, scope data.MCPScope) (*data.Store, *httptest.Server, string) {
	t.Helper()
	store := newTestStore(t)

	now := time.Now()
	if err := store.Save(func(d *data.StoreData) error {
		d.Panel.Groups = []data.Group{{ID: 1, Name: "Infra", Sort: 1, CreatedAt: now, UpdatedAt: now}}
		d.Panel.Items = []data.Item{{
			ID: 10, GroupID: 1, Title: "Proxmox", URL: "https://pve.local",
			OpenMethod: "new_tab", Sort: 1, CreatedAt: now, UpdatedAt: now,
		}}
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
		d.MCP.TokenHash = hash
		d.MCP.TokenPrefix = prefix
		d.MCP.Scope = scope
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

func connectMCP(t *testing.T, url, token string) *mcp.ClientSession {
	t.Helper()
	transport := &mcp.StreamableClientTransport{
		Endpoint:              url,
		HTTPClient:            &http.Client{Transport: &bearerRT{token: token, base: http.DefaultTransport}},
		DisableStandaloneSSE:  true,
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

func TestMCPReadOnlyFlow(t *testing.T) {
	_, srv, token := newMCPTestServer(t, data.MCPScopeReadOnly)
	sess := connectMCP(t, srv.URL, token)
	ctx := context.Background()

	tools, err := sess.ListTools(ctx, &mcp.ListToolsParams{})
	if err != nil {
		t.Fatalf("ListTools: %v", err)
	}
	if len(tools.Tools) != 8 {
		t.Errorf("tools count = %d, want 8", len(tools.Tools))
	}

	// list_groups：不含应用。
	res := callTool(t, sess, "homelab_panel_list_groups", nil)
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

	// read_only 调写工具 → tool error（permission denied）。
	res = callTool(t, sess, "homelab_panel_patch_app", map[string]any{"id": 10, "title": "X"})
	if !res.IsError {
		t.Error("read_only scope should reject write tool")
	}
}

func TestMCPWriteFlow(t *testing.T) {
	store, srv, token := newMCPTestServer(t, data.MCPScopeReadWrite)
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

	// rename_group。
	res = callTool(t, sess, "homelab_panel_rename_group", map[string]any{"group_id": 1, "name": "Infrastructure"})
	group := structuredMap(t, res)["group"].(map[string]any)
	if group["name"] != "Infrastructure" {
		t.Errorf("renamed group = %v", group["name"])
	}

	// replace_app。
	res = callTool(t, sess, "homelab_panel_replace_app", map[string]any{
		"id": 10, "group_id": 1, "title": "PVE", "url": "https://pve2.local",
	})
	item = structuredMap(t, res)["item"].(map[string]any)
	if item["title"] != "PVE" || item["url"] != "https://pve2.local" {
		t.Errorf("replace result = %v", item)
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
