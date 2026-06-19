package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// newAuthHandler 返回已就绪的 handler 与已知管理员密码（便于测试登录）。
func newAuthHandler(t *testing.T) (*Handler, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	store := mustStore(t)
	if err := store.EnsureSecret(); err != nil {
		t.Fatalf("ensure secret: %v", err)
	}
	const password = "secret123"
	if err := store.ResetPassword(password); err != nil {
		t.Fatalf("reset password: %v", err)
	}
	h := NewHandler(Deps{Store: store, DataDir: t.TempDir()})
	return h, password
}

func TestCreateSessionIssuesValidJWT(t *testing.T) {
	h, password := newAuthHandler(t)
	r := gin.New()
	r.POST("/api/v1/admin/session", h.CreateAdminSession)

	body, _ := json.Marshal(map[string]string{"password": password})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/session", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (body=%s)", w.Code, w.Body.String())
	}
	var resp struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !h.tokens.Valid(resp.Token) {
		t.Fatal("issued token should validate")
	}
}

func TestCreateSessionRejectsWrongPassword(t *testing.T) {
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.POST("/api/v1/admin/session", h.CreateAdminSession)

	body, _ := json.Marshal(map[string]string{"password": "wrong"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/session", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestLogoutRevokesSession(t *testing.T) {
	h, _ := newAuthHandler(t)
	token, _, _ := h.tokens.Issue()
	if !h.tokens.Valid(token) {
		t.Fatal("token should be valid before logout")
	}
	r := gin.New()
	r.DELETE("/api/v1/admin/session", h.RequireAdmin(), h.DeleteAdminSession)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/session", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
	if h.tokens.Valid(token) {
		t.Fatal("token should be invalid after logout")
	}
}

func TestChangePasswordReissuesToken(t *testing.T) {
	h, password := newAuthHandler(t)
	token, _, _ := h.tokens.Issue()

	r := gin.New()
	r.PUT("/api/v1/admin/password", h.RequireAdmin(), h.UpdateAdminPassword)

	body, _ := json.Marshal(map[string]string{
		"old_password": password,
		"new_password": "newpass456",
	})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/password", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	var resp struct {
		OK    bool   `json:"ok"`
		Token string `json:"token"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if !resp.OK || resp.Token == "" {
		t.Fatalf("expected ok+token, got %+v", resp)
	}
	if h.tokens.Valid(token) {
		t.Fatal("old token should be invalid after password change")
	}
	if !h.tokens.Valid(resp.Token) {
		t.Fatal("reissued token should be valid")
	}
}
