package router

import (
	"homelab-panel/internal/app/global"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func TestSwaggerIndexRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil)
	newTestRouter(t).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if !strings.Contains(recorder.Body.String(), "Swagger UI") {
		t.Fatalf("swagger index body does not contain Swagger UI")
	}
}

func TestMissingStaticAssetsReturnNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := newTestRouter(t)

	for _, path := range []string{
		"/assets/missing.js",
		"/custom/missing.js",
		"/static/missing.css",
	} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, path, nil)

			router.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusNotFound {
				t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNotFound)
			}
			if strings.Contains(recorder.Body.String(), "<html") {
				t.Fatalf("missing static asset returned HTML fallback")
			}
		})
	}
}

func TestEmbeddedStaticServesCustomScript(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/custom/index.js", nil)
	newTestRouter(t).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if contentType := recorder.Header().Get("Content-Type"); !strings.Contains(contentType, "javascript") {
		t.Fatalf("Content-Type = %q, want javascript", contentType)
	}
}

func TestEmbeddedStaticServesUnderscoreAssets(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/assets/_plugin-vue_export-helper-c27b6911.js", nil)
	newTestRouter(t).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if contentType := recorder.Header().Get("Content-Type"); !strings.Contains(contentType, "javascript") {
		t.Fatalf("Content-Type = %q, want javascript", contentType)
	}
	if strings.TrimSpace(recorder.Body.String()) != "export default {}" {
		t.Fatalf("body = %q, want underscore asset JS", recorder.Body.String())
	}
}

func TestSpaRoutesFallbackToIndex(t *testing.T) {
	gin.SetMode(gin.TestMode)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/some/spa/route", nil)
	newTestRouter(t).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if !strings.Contains(recorder.Body.String(), "<html") {
		t.Fatalf("SPA route did not return index HTML")
	}
}

func newTestRouter(t *testing.T) *gin.Engine {
	t.Helper()

	workspace := t.TempDir()
	distDir := filepath.Join(workspace, "web", "dist")
	if err := os.MkdirAll(distDir, 0755); err != nil {
		t.Fatalf("create dist dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("<html></html>"), 0644); err != nil {
		t.Fatalf("write embedded index fixture: %v", err)
	}
	assetsDir := filepath.Join(distDir, "assets")
	if err := os.MkdirAll(assetsDir, 0755); err != nil {
		t.Fatalf("create assets dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(assetsDir, "_plugin-vue_export-helper-c27b6911.js"), []byte("export default {}"), 0644); err != nil {
		t.Fatalf("write underscore asset fixture: %v", err)
	}
	customDir := filepath.Join(distDir, "custom")
	if err := os.MkdirAll(customDir, 0755); err != nil {
		t.Fatalf("create custom dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(customDir, "index.js"), []byte("\n"), 0644); err != nil {
		t.Fatalf("write custom JS fixture: %v", err)
	}

	global.DataDir = filepath.Join(workspace, "data")
	global.Logger = zap.NewNop().Sugar()
	global.WebFS = os.DirFS(workspace)

	return NewRouter()
}
