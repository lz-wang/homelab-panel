package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestMCPSettingsGetAndUpdate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.GET("/mcp/settings", h.GetMCPSettings)
	r.PUT("/mcp/settings", h.UpdateMCPSettings)

	// initial get: disabled, no tokens
	req := httptest.NewRequest(http.MethodGet, "/mcp/settings", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("get expected 200, got %d", w.Code)
	}

	// update enabled=true
	body, _ := json.Marshal(map[string]bool{"enabled": true})
	req = httptest.NewRequest(http.MethodPut, "/mcp/settings", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("update expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	var resp struct {
		Enabled bool `json:"enabled"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Enabled {
		t.Error("expected enabled=true after update")
	}
}

func TestUpdateMCPSettingsInvalidBody(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.PUT("/mcp/settings", h.UpdateMCPSettings)

	req := httptest.NewRequest(http.MethodPut, "/mcp/settings", bytes.NewReader([]byte("not json")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestMCPGenerateAndDeleteToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.POST("/mcp/token", h.GenerateMCPToken)
	r.DELETE("/mcp/token/:prefix", h.DeleteMCPToken)
	r.GET("/mcp/settings", h.GetMCPSettings)

	// generate → enables MCP implicitly + returns plaintext once
	req := httptest.NewRequest(http.MethodPost, "/mcp/token", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("generate expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	var gen struct {
		Token       string `json:"token"`
		TokenPrefix string `json:"token_prefix"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &gen); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if gen.Token == "" || gen.TokenPrefix == "" {
		t.Fatalf("expected token+prefix, got %+v", gen)
	}

	// settings lists the token + enabled
	req = httptest.NewRequest(http.MethodGet, "/mcp/settings", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var settings struct {
		Enabled bool `json:"enabled"`
		Tokens  []struct {
			Prefix string `json:"prefix"`
		} `json:"tokens"`
	}
	json.Unmarshal(w.Body.Bytes(), &settings)
	if !settings.Enabled || len(settings.Tokens) != 1 || settings.Tokens[0].Prefix != gen.TokenPrefix {
		t.Fatalf("unexpected settings: %+v", settings)
	}

	// delete token
	req = httptest.NewRequest(http.MethodDelete, "/mcp/token/"+gen.TokenPrefix, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("delete expected 200, got %d", w.Code)
	}

	// delete again → 404
	req = httptest.NewRequest(http.MethodDelete, "/mcp/token/"+gen.TokenPrefix, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("delete missing expected 404, got %d", w.Code)
	}
}
