package handlers

import (
	"net/http"
	"time"

	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"
	"homelab-panel/internal/mcpserver"

	"github.com/gin-gonic/gin"
)

// mcpSettingsResponse 是 MCP 设置的只读视图：绝不返回 token hash，仅返回可展示前缀。
type mcpSettingsResponse struct {
	Enabled     bool       `json:"enabled"`
	Scope       string     `json:"scope"`
	HasToken    bool       `json:"has_token"`
	TokenPrefix string     `json:"token_prefix,omitempty"`
	CreatedAt   *time.Time `json:"created_at,omitempty"`
	UpdatedAt   *time.Time `json:"updated_at,omitempty"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
}

// mcpTokenResponse 仅在生成/重置 token 时返回明文一次。
type mcpTokenResponse struct {
	Token       string `json:"token"`
	TokenPrefix string `json:"token_prefix"`
}

// mcpSettingsRequest 用指针字段支持部分更新：缺省字段不改动当前值。
type mcpSettingsRequest struct {
	Enabled *bool   `json:"enabled"`
	Scope   *string `json:"scope"`
}

func validMCPScope(scope string) bool {
	switch data.MCPScope(scope) {
	case data.MCPScopeReadOnly, data.MCPScopeReadWrite:
		return true
	default:
		return false
	}
}

// generateMCPToken 包装 mcpserver.GenerateToken，集中 token 生成入口。
func generateMCPToken() (plain string, prefix string, hash string, err error) {
	return mcpserver.GenerateToken()
}

func mcpSettingsView(cfg data.MCPConfig) mcpSettingsResponse {
	resp := mcpSettingsResponse{
		Enabled:  cfg.Enabled,
		Scope:    string(cfg.Scope),
		HasToken: cfg.TokenHash != "",
	}
	if cfg.TokenPrefix != "" {
		resp.TokenPrefix = cfg.TokenPrefix
	}
	if !cfg.CreatedAt.IsZero() {
		resp.CreatedAt = &cfg.CreatedAt
	}
	if !cfg.UpdatedAt.IsZero() {
		resp.UpdatedAt = &cfg.UpdatedAt
	}
	if !cfg.LastUsedAt.IsZero() {
		resp.LastUsedAt = &cfg.LastUsedAt
	}
	return resp
}

// GetMCPSettings 返回 MCP 开关、权限范围与 token 状态（不含 hash）。
func (h *Handler) GetMCPSettings(c *gin.Context) {
	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, mcpSettingsView(snap.MCP))
}

// UpdateMCPSettings 修改 enabled 与 scope。
func (h *Handler) UpdateMCPSettings(c *gin.Context) {
	var req mcpSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	var scope string
	if req.Scope != nil {
		scope = *req.Scope
		if !validMCPScope(scope) {
			logging.Warnf("invalid mcp scope %q from %s", scope, c.ClientIP())
			writeError(c, http.StatusBadRequest, "invalid mcp scope")
			return
		}
	}

	err := h.Store.Save(func(d *data.StoreData) error {
		if req.Enabled != nil {
			d.MCP.Enabled = *req.Enabled
		}
		if scope != "" {
			d.MCP.Scope = data.MCPScope(scope)
		}
		d.MCP.UpdatedAt = time.Now()
		return nil
	})
	if err != nil {
		logging.Errorf("save mcp settings failed: %v", err)
		writeError(c, http.StatusInternalServerError, "save mcp settings failed")
		return
	}

	logging.Infof("mcp settings updated (enabled=%t scope=%s) from %s",
		req.Enabled, scope, c.ClientIP())

	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, mcpSettingsView(snap.MCP))
}

// GenerateMCPToken 首次生成 token：明文只返回一次，并隐式启用 MCP。
// 若 token 已存在则拒绝，提示使用 reset。
func (h *Handler) GenerateMCPToken(c *gin.Context) {
	plain, prefix, hash, err := generateMCPToken()
	if err != nil {
		logging.Errorf("generate mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "generate mcp token failed")
		return
	}

	now := time.Now()
	alreadyExists := false
	err = h.Store.Save(func(d *data.StoreData) error {
		if d.MCP.TokenHash != "" {
			alreadyExists = true
			return nil
		}
		d.MCP.TokenHash = hash
		d.MCP.TokenPrefix = prefix
		d.MCP.Enabled = true
		d.MCP.CreatedAt = now
		d.MCP.UpdatedAt = now
		return nil
	})
	if err != nil {
		logging.Errorf("save mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "save mcp token failed")
		return
	}
	if alreadyExists {
		logging.Warnf("mcp token generate rejected: token exists, from %s", c.ClientIP())
		writeError(c, http.StatusConflict, "mcp token already exists; use reset")
		return
	}

	logging.Infof("mcp token generated from %s", c.ClientIP())
	writeJSON(c, http.StatusOK, mcpTokenResponse{Token: plain, TokenPrefix: prefix})
}

// ResetMCPToken 生成新 token，旧 token 因 hash 变更立即失效。
func (h *Handler) ResetMCPToken(c *gin.Context) {
	plain, prefix, hash, err := generateMCPToken()
	if err != nil {
		logging.Errorf("generate mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "generate mcp token failed")
		return
	}

	now := time.Now()
	err = h.Store.Save(func(d *data.StoreData) error {
		d.MCP.TokenHash = hash
		d.MCP.TokenPrefix = prefix
		d.MCP.Enabled = true
		d.MCP.CreatedAt = now
		d.MCP.UpdatedAt = now
		d.MCP.LastUsedAt = time.Time{}
		return nil
	})
	if err != nil {
		logging.Errorf("save mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "save mcp token failed")
		return
	}

	logging.Infof("mcp token reset from %s", c.ClientIP())
	writeJSON(c, http.StatusOK, mcpTokenResponse{Token: plain, TokenPrefix: prefix})
}

// DeleteMCPToken 删除 token 并禁用 MCP。
func (h *Handler) DeleteMCPToken(c *gin.Context) {
	now := time.Now()
	err := h.Store.Save(func(d *data.StoreData) error {
		d.MCP.TokenHash = ""
		d.MCP.TokenPrefix = ""
		d.MCP.Enabled = false
		d.MCP.CreatedAt = time.Time{}
		d.MCP.LastUsedAt = time.Time{}
		d.MCP.UpdatedAt = now
		return nil
	})
	if err != nil {
		logging.Errorf("delete mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "delete mcp token failed")
		return
	}

	logging.Infof("mcp token deleted from %s", c.ClientIP())

	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, mcpSettingsView(snap.MCP))
}
