package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetPanel(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.GET("/panel", h.GetPanel)

	req := httptest.NewRequest(http.MethodGet, "/panel", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	var resp struct {
		SiteName string            `json:"site_name"`
		Config   json.RawMessage   `json:"config"`
		Groups   []json.RawMessage `json:"groups"`
		Items    []json.RawMessage `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	// empty config normalizes to "{}", never null
	if string(resp.Config) == "" {
		t.Error("expected non-empty config")
	}
}
