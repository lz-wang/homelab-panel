package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestUpdatePasswordRejectsInvalidBodies 直接注册 handler（绕过 RequireAdmin）
// 以覆盖 UpdateAdminPassword 的请求校验与 old-password 校验分支。
func TestUpdatePasswordRejectsInvalidBodies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h, _ := newAuthHandler(t)
	r := gin.New()
	r.PUT("/password", h.UpdateAdminPassword)

	cases := []struct {
		name string
		body string
		want int
	}{
		{"malformed json", "not json", http.StatusBadRequest},
		{"empty new password", `{"old_password":"x","new_password":""}`, http.StatusBadRequest},
		{"short new password", `{"old_password":"x","new_password":"12345"}`, http.StatusBadRequest},
		{"wrong old password", `{"old_password":"wrong","new_password":"newpass456"}`, http.StatusUnauthorized},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPut, "/password", bytes.NewReader([]byte(c.body)))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != c.want {
				t.Fatalf("%s: expected %d, got %d (body=%s)", c.name, c.want, w.Code, w.Body.String())
			}
		})
	}
}
