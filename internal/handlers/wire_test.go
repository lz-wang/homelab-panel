package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

func TestPanelRequestUsesSnakeCaseJSONKeys(t *testing.T) {
	raw, err := json.Marshal(panelRequest{
		SiteName:     "Lab",
		SearchEngine: json.RawMessage(`{}`),
		Groups:       []groupInput{{ID: 1, Name: "g"}},
		Items: []itemInput{
			{GroupID: 1, Title: "i", URL: "https://a"},
		},
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)
	for _, k := range []string{`"site_name"`, `"search_engine"`, `"group_id"`} {
		if !strings.Contains(got, k) {
			t.Errorf("expected %s in panelRequest JSON, got: %s", k, got)
		}
	}
	for _, k := range []string{`"siteName"`, `"searchEngine"`, `"groupId"`} {
		if strings.Contains(got, k) {
			t.Errorf("camelCase %s should not appear, got: %s", k, got)
		}
	}
}

func TestPasswordRequestUsesSnakeCaseJSONKeys(t *testing.T) {
	raw, err := json.Marshal(passwordRequest{OldPassword: "old", NewPassword: "new"})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)
	for _, k := range []string{`"old_password"`, `"new_password"`} {
		if !strings.Contains(got, k) {
			t.Errorf("expected %s, got: %s", k, got)
		}
	}
}

func TestPanelViewUsesSnakeCaseKeys(t *testing.T) {
	view := panelView(data.Panel{SiteName: "Lab"})
	raw, err := json.Marshal(view)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)
	for _, k := range []string{`"site_name"`, `"search_engine"`, `"groups"`, `"items"`} {
		if !strings.Contains(got, k) {
			t.Errorf("expected %s in panelView, got: %s", k, got)
		}
	}
	if strings.Contains(got, `"siteName"`) || strings.Contains(got, `"searchEngine"`) {
		t.Errorf("camelCase key should not appear in panelView, got: %s", got)
	}
}

func TestCreateAdminSessionResponseUsesSnakeCase(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store, password, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	h := NewHandler(Deps{Store: store, DataDir: t.TempDir()})
	r := gin.New()
	r.POST("/api/v1/admin/session", h.CreateAdminSession)

	body, _ := json.Marshal(sessionRequest{Password: password})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/session", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (body=%s)", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"expires_at"`) {
		t.Errorf("expected expires_at in session response, got: %s", w.Body.String())
	}
	if strings.Contains(w.Body.String(), `"expiresAt"`) {
		t.Errorf("camelCase expiresAt should not appear, got: %s", w.Body.String())
	}
}
