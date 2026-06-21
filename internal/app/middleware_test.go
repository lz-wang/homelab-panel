package app

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSameOrigin(t *testing.T) {
	cases := []struct {
		origin string
		host   string
		want   bool
	}{
		{"http://example.com", "example.com", true},
		{"https://example.com:8080", "example.com:8080", true},
		{"http://example.com/path", "example.com", true},
		{"http://evil.com", "example.com", false},
		{"malformed", "example.com", false},
		{"", "example.com", false},
	}
	for _, c := range cases {
		if got := sameOrigin(c.origin, c.host); got != c.want {
			t.Errorf("sameOrigin(%q, %q) = %v, want %v", c.origin, c.host, got, c.want)
		}
	}
}

func TestOriginCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(OriginCheck())
	r.Any("/mcp", func(c *gin.Context) { c.Status(http.StatusOK) })

	cases := []struct {
		name   string
		origin string
		host   string
		want   int
	}{
		{"empty origin allowed", "", "h", http.StatusOK},
		{"same origin allowed", "http://h", "h", http.StatusOK},
		{"cross origin rejected", "http://evil", "h", http.StatusForbidden},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/mcp", nil)
			if c.origin != "" {
				req.Header.Set("Origin", c.origin)
			}
			req.Host = c.host
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != c.want {
				t.Fatalf("expected %d, got %d", c.want, w.Code)
			}
		})
	}
}

func TestLimitBodySize(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(LimitBodySize(8))
	r.POST("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodPost, "/x", strings.NewReader("short"))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected middleware to pass through (200), got %d", w.Code)
	}
}

func TestRequestLogger(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(requestLogger())
	r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}
