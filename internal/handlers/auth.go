package handlers

import (
	"errors"
	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"
	"net/http"

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
		logging.Warnf("admin login failed: invalid password from %s", c.ClientIP())
		writeError(c, http.StatusUnauthorized, "invalid password")
		return
	}
	token, expires, err := h.tokens.Issue()
	if err != nil {
		logging.Errorf("issue session failed: %v", err)
		writeError(c, http.StatusInternalServerError, "create session failed")
		return
	}
	logging.Infof("admin login from %s", c.ClientIP())
	writeJSON(c, http.StatusCreated, gin.H{"token": token, "expires_at": expires})
}

func (h *Handler) GetAdminSession(c *gin.Context) {
	writeJSON(c, http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) DeleteAdminSession(c *gin.Context) {
	if err := h.tokens.Revoke(); err != nil {
		logging.Errorf("revoke session failed: %v", err)
		writeError(c, http.StatusInternalServerError, "revoke session failed")
		return
	}
	logging.Infof("admin logged out from %s", c.ClientIP())
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
			logging.Warnf("admin password change failed: old password incorrect from %s", c.ClientIP())
			writeError(c, http.StatusUnauthorized, "old password is incorrect")
			return
		}
		logging.Errorf("update password failed: %v", err)
		writeError(c, http.StatusInternalServerError, "update password failed")
		return
	}
	// 改密成功：作废旧 token（踢掉其他设备），并为当前会话重签。
	// 若 Revoke 成功而 Issue 失败（极罕见的磁盘/熵错误），旧 token 已失效且无新 token 返回，
	// 用户需用新密码重新登录——属 fail-safe，不会残留可用旧凭证。
	if err := h.tokens.Revoke(); err != nil {
		logging.Errorf("rotate session failed: %v", err)
		writeError(c, http.StatusInternalServerError, "rotate session failed")
		return
	}
	token, expires, err := h.tokens.Issue()
	if err != nil {
		logging.Errorf("reissue session failed: %v", err)
		writeError(c, http.StatusInternalServerError, "reissue session failed")
		return
	}
	logging.Infof("admin password changed from %s", c.ClientIP())
	writeJSON(c, http.StatusOK, gin.H{"ok": true, "token": token, "expires_at": expires})
}
