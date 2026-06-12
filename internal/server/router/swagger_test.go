package router

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sun-panel/internal/app/global"
	appConfig "sun-panel/internal/config"
	"testing"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func TestSwaggerIndexRoute(t *testing.T) {
	workspace := t.TempDir()
	distDir := filepath.Join(workspace, "web", "dist")
	if err := os.MkdirAll(distDir, 0755); err != nil {
		t.Fatalf("create dist dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("<html></html>"), 0644); err != nil {
		t.Fatalf("write embedded index fixture: %v", err)
	}

	cfg, err := appConfig.Load(t.TempDir())
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	gin.SetMode(gin.TestMode)
	global.Config = cfg
	global.Logger = zap.NewNop().Sugar()
	global.WebFS = os.DirFS(workspace)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/swagger/index.html", nil)
	NewRouter().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if !strings.Contains(recorder.Body.String(), "Swagger UI") {
		t.Fatalf("swagger index body does not contain Swagger UI")
	}
}
