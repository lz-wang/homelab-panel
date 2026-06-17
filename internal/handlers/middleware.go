package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const adminTokenKey = "adminToken"

func (h *Handler) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if !h.tokens.Valid(token) {
			writeError(c, http.StatusUnauthorized, "invalid or missing admin token")
			c.Abort()
			return
		}
		c.Set(adminTokenKey, token)
		c.Next()
	}
}

func currentAdminToken(c *gin.Context) string {
	if v, ok := c.Get(adminTokenKey); ok {
		if t, ok := v.(string); ok {
			return t
		}
	}
	return ""
}

func bearerToken(header string) string {
	kind, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(kind, "Bearer") {
		return ""
	}
	return strings.TrimSpace(token)
}
