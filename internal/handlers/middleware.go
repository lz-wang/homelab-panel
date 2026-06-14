package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

const (
	currentUserKey    = "currentUser"
	currentSessionKey = "currentSession"
)

func (h *Handler) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if token == "" {
			writeError(c, http.StatusUnauthorized, "missing bearer token")
			c.Abort()
			return
		}

		var session data.Session
		err := h.DB.Where("token_hash = ? AND revoked_at IS NULL AND expires_at > ?", tokenHash(token), time.Now()).
			First(&session).Error
		if err != nil {
			writeError(c, http.StatusUnauthorized, "invalid session")
			c.Abort()
			return
		}

		var user data.User
		if err := h.DB.First(&user, session.UserID).Error; err != nil {
			writeError(c, http.StatusUnauthorized, "invalid user")
			c.Abort()
			return
		}
		if user.Status != "active" {
			writeError(c, http.StatusForbidden, "user disabled")
			c.Abort()
			return
		}

		c.Set(currentUserKey, &user)
		c.Set(currentSessionKey, &session)
		c.Next()
	}
}

func (h *Handler) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, ok := currentUser(c)
		if !ok || user.Role != "admin" {
			writeError(c, http.StatusForbidden, "admin permission required")
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

func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func currentUser(c *gin.Context) (*data.User, bool) {
	value, ok := c.Get(currentUserKey)
	if !ok {
		return nil, false
	}
	user, ok := value.(*data.User)
	return user, ok
}

func currentSession(c *gin.Context) (*data.Session, bool) {
	value, ok := c.Get(currentSessionKey)
	if !ok {
		return nil, false
	}
	session, ok := value.(*data.Session)
	return session, ok
}
