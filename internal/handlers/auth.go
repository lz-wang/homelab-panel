package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type passwordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Username == "" || req.Password == "" {
		writeError(c, http.StatusBadRequest, "username and password are required")
		return
	}

	var user data.User
	err := h.DB.Where("username = ?", req.Username).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(c, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if err != nil {
		writeError(c, http.StatusInternalServerError, "load user failed")
		return
	}
	if user.Status != "active" {
		writeError(c, http.StatusForbidden, "user disabled")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeError(c, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token, err := newSessionToken()
	if err != nil {
		writeError(c, http.StatusInternalServerError, "create session failed")
		return
	}
	session := data.Session{
		UserID:    user.ID,
		TokenHash: tokenHash(token),
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}
	if err := h.DB.Create(&session).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "save session failed")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"expiresAt": session.ExpiresAt,
		"user":      user,
	})
}

func (h *Handler) Logout(c *gin.Context) {
	session, ok := currentSession(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid session")
		return
	}

	now := time.Now()
	if err := h.DB.Model(session).Update("revoked_at", &now).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "logout failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) Me(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) UpdatePassword(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var req passwordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.OldPassword == "" || req.NewPassword == "" {
		writeError(c, http.StatusBadRequest, "oldPassword and newPassword are required")
		return
	}
	if len(req.NewPassword) < 6 {
		writeError(c, http.StatusBadRequest, "newPassword must be at least 6 characters")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		writeError(c, http.StatusForbidden, "old password is incorrect")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "hash password failed")
		return
	}

	if err := h.DB.Model(user).Update("password_hash", string(hash)).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "update password failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func newSessionToken() (string, error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", fmt.Errorf("read random token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf[:]), nil
}
