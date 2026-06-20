package mcpserver

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"homelab-panel/internal/data"
)

func newTestStore(t *testing.T) *data.Store {
	t.Helper()
	store, _, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	return store
}

// newMCPStore 构造一个带 token 的测试 store，返回 store 与明文 token。
func newMCPStore(t *testing.T, enabled bool) (*data.Store, string) {
	t.Helper()
	store := newTestStore(t)
	plain, prefix, hash, err := GenerateToken()
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	if err := store.Save(func(d *data.StoreData) error {
		d.MCP.Enabled = enabled
		d.MCP.Tokens = []data.MCPToken{{Prefix: prefix, Hash: hash}}
		return nil
	}); err != nil {
		t.Fatalf("seed mcp config: %v", err)
	}
	return store, plain
}

func TestAuthMiddleware(t *testing.T) {
	enabledStore, validToken := newMCPStore(t, true)
	disabledStore, _ := newMCPStore(t, false)
	wrongToken := "hlpmcp_deadbeef.thisisnottherealsecret"

	cases := []struct {
		name  string
		store *data.Store
		auth  string
		want  int
	}{
		{"missing bearer", enabledStore, "", http.StatusUnauthorized},
		{"no bearer prefix", enabledStore, validToken, http.StatusUnauthorized},
		{"invalid token", enabledStore, "Bearer " + wrongToken, http.StatusUnauthorized},
		{"valid token", enabledStore, "Bearer " + validToken, http.StatusOK},
		{"mcp disabled", disabledStore, "Bearer " + validToken, http.StatusForbidden},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			handler := AuthMiddleware(c.store, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))
			srv := httptest.NewServer(handler)
			defer srv.Close()

			req, err := http.NewRequest(http.MethodPost, srv.URL, strings.NewReader("{}"))
			if err != nil {
				t.Fatalf("new request: %v", err)
			}
			req.Header.Set("Content-Type", "application/json")
			if c.auth != "" {
				req.Header.Set("Authorization", c.auth)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("do request: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != c.want {
				t.Errorf("status = %d, want %d", resp.StatusCode, c.want)
			}
		})
	}
}
