package handlers

import (
	"homelab-panel/internal/logging"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if !h.tokens.Valid(token) {
			logging.Warnf("unauthorized admin request to %s from %s", c.Request.URL.Path, c.ClientIP())
			writeError(c, http.StatusUnauthorized, "invalid or missing admin token")
			c.Abort()
			return
		}
		c.Next()
	}
}

func bearerToken(header string) string {
	kind, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(kind, "Bearer") {
		return ""
	}
	return strings.TrimSpace(token)
}
