package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHealth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.GET("/health", h.Health)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Status != "ok" {
		t.Errorf("status = %q, want ok", resp.Status)
	}
}

func TestAbout(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	h.Version = "vtest"
	h.GoMod = "module homelab-panel\n\ngo 1.26\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.12.0\n)\n"

	r := gin.New()
	r.GET("/about", h.About)

	req := httptest.NewRequest(http.MethodGet, "/about", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp struct {
		Name    string `json:"name"`
		Version string `json:"version"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Name != "homelab-panel" || resp.Version != "vtest" {
		t.Errorf("got name=%q version=%q", resp.Name, resp.Version)
	}
}
