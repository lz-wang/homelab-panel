package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"

	"github.com/gin-gonic/gin"
)

func TestStaticCacheControlHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	webFS := fstest.MapFS{
		"index.html":            {Data: []byte("<html>index</html>")},
		"assets/index-AbCd1.js": {Data: []byte("console.log(1)")},
	}
	h := NewHandler(Deps{DataDir: t.TempDir(), WebFS: webFS})
	r := gin.New()
	r.NoRoute(h.Static)

	cases := []struct {
		path     string
		expected string
	}{
		{"/assets/index-AbCd1.js", "public, max-age=31536000, immutable"},
		{"/index.html", "no-cache"},
		{"/", "no-cache"},
	}

	for _, tc := range cases {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, tc.path, nil))

		if w.Code != http.StatusOK {
			t.Fatalf("GET %s expected 200, got %d", tc.path, w.Code)
		}
		if cc := w.Header().Get("Cache-Control"); cc != tc.expected {
			t.Errorf("GET %s Cache-Control = %q, want %q", tc.path, cc, tc.expected)
		}
	}
}
