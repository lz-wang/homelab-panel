package handlers

import (
	"errors"
	"net/http"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

type sessionRequest struct {
	Password string `json:"password"`
}

type passwordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) CreateAdminSession(c *gin.Context) {
	var req sessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if !h.Store.CheckPassword(req.Password) {
		writeError(c, http.StatusUnauthorized, "invalid password")
		return
	}
	token, expires, err := h.tokens.Issue()
	if err != nil {
		writeError(c, http.StatusInternalServerError, "create session failed")
		return
	}
	writeJSON(c, http.StatusCreated, gin.H{"token": token, "expires_at": expires})
}

func (h *Handler) DeleteAdminSession(c *gin.Context) {
	if err := h.tokens.Revoke(); err != nil {
		writeError(c, http.StatusInternalServerError, "revoke session failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateAdminPassword(c *gin.Context) {
	var req passwordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.NewPassword == "" {
		writeError(c, http.StatusBadRequest, "newPassword is required")
		return
	}
	if len(req.NewPassword) < 6 {
		writeError(c, http.StatusBadRequest, "newPassword must be at least 6 characters")
		return
	}
	err := h.Store.UpdatePassword(req.OldPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, data.ErrInvalidPassword) {
			writeError(c, http.StatusUnauthorized, "old password is incorrect")
			return
		}
		writeError(c, http.StatusInternalServerError, "update password failed")
		return
	}
	// 改密成功：作废旧 token（踢掉其他设备），并为当前会话重签
	if err := h.tokens.Revoke(); err != nil {
		writeError(c, http.StatusInternalServerError, "rotate session failed")
		return
	}
	token, expires, err := h.tokens.Issue()
	if err != nil {
		writeError(c, http.StatusInternalServerError, "reissue session failed")
		return
	}
	writeJSON(c, http.StatusOK, gin.H{"ok": true, "token": token, "expires_at": expires})
}
