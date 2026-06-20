package handlers

import (
	"net/http"
	"time"

	"homelab-panel/internal/data"
	"homelab-panel/internal/logging"
	"homelab-panel/internal/mcpserver"

	"github.com/gin-gonic/gin"
)

// mcpTokenInfo 是单个 token 的只读视图：仅返回可展示前缀与时间，绝不返回 hash。
type mcpTokenInfo struct {
	Prefix     string     `json:"prefix"`
	CreatedAt  *time.Time `json:"created_at,omitempty"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
}

// mcpSettingsResponse 是 MCP 设置的只读视图。
type mcpSettingsResponse struct {
	Enabled    bool           `json:"enabled"`
	Tokens     []mcpTokenInfo `json:"tokens"`
	UpdatedAt  *time.Time     `json:"updated_at,omitempty"`
}

// mcpTokenResponse 仅在生成 token 时返回明文一次。
type mcpTokenResponse struct {
	Token       string `json:"token"`
	TokenPrefix string `json:"token_prefix"`
}

// mcpSettingsRequest 用指针字段支持部分更新：缺省字段不改动当前值。
type mcpSettingsRequest struct {
	Enabled *bool `json:"enabled"`
}

// generateMCPToken 包装 mcpserver.GenerateToken，集中 token 生成入口。
func generateMCPToken() (plain string, prefix string, hash string, err error) {
	return mcpserver.GenerateToken()
}

func tokenInfoView(t data.MCPToken) mcpTokenInfo {
	info := mcpTokenInfo{Prefix: t.Prefix}
	if !t.CreatedAt.IsZero() {
		info.CreatedAt = &t.CreatedAt
	}
	if !t.LastUsedAt.IsZero() {
		info.LastUsedAt = &t.LastUsedAt
	}
	return info
}

func mcpSettingsView(cfg data.MCPConfig) mcpSettingsResponse {
	resp := mcpSettingsResponse{
		Enabled: cfg.Enabled,
		Tokens:  make([]mcpTokenInfo, 0, len(cfg.Tokens)),
	}
	for _, t := range cfg.Tokens {
		resp.Tokens = append(resp.Tokens, tokenInfoView(t))
	}
	if !cfg.UpdatedAt.IsZero() {
		resp.UpdatedAt = &cfg.UpdatedAt
	}
	return resp
}

// GetMCPSettings 返回 MCP 开关与 token 列表（不含 hash）。
func (h *Handler) GetMCPSettings(c *gin.Context) {
	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, mcpSettingsView(snap.MCP))
}

// UpdateMCPSettings 修改 enabled。
func (h *Handler) UpdateMCPSettings(c *gin.Context) {
	var req mcpSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.Store.Save(func(d *data.StoreData) error {
		if req.Enabled != nil {
			d.MCP.Enabled = *req.Enabled
		}
		d.MCP.UpdatedAt = time.Now()
		return nil
	})
	if err != nil {
		logging.Errorf("save mcp settings failed: %v", err)
		writeError(c, http.StatusInternalServerError, "save mcp settings failed")
		return
	}

	logging.Infof("mcp settings updated (enabled=%t) from %s", req.Enabled, c.ClientIP())

	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, mcpSettingsView(snap.MCP))
}

// GenerateMCPToken 生成一个新 token 并加入列表，明文只返回一次，并隐式启用 MCP。
// 支持生成多个 token（每个独立前缀与 hash）。
func (h *Handler) GenerateMCPToken(c *gin.Context) {
	plain, prefix, hash, err := generateMCPToken()
	if err != nil {
		logging.Errorf("generate mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "generate mcp token failed")
		return
	}

	now := time.Now()
	err = h.Store.Save(func(d *data.StoreData) error {
		d.MCP.Tokens = append(d.MCP.Tokens, data.MCPToken{
			Prefix:    prefix,
			Hash:      hash,
			CreatedAt: now,
		})
		d.MCP.Enabled = true
		d.MCP.UpdatedAt = now
		return nil
	})
	if err != nil {
		logging.Errorf("save mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "save mcp token failed")
		return
	}

	logging.Infof("mcp token generated (prefix=%s) from %s", prefix, c.ClientIP())
	writeJSON(c, http.StatusOK, mcpTokenResponse{Token: plain, TokenPrefix: prefix})
}

// DeleteMCPToken 按前缀删除指定 token；被删 token 因 hash 移除立即失效。
func (h *Handler) DeleteMCPToken(c *gin.Context) {
	prefix := c.Param("prefix")
	if prefix == "" {
		writeError(c, http.StatusBadRequest, "token prefix is required")
		return
	}

	now := time.Now()
	found := false
	err := h.Store.Save(func(d *data.StoreData) error {
		kept := make([]data.MCPToken, 0, len(d.MCP.Tokens))
		for _, t := range d.MCP.Tokens {
			if t.Prefix == prefix {
				found = true
				continue
			}
			kept = append(kept, t)
		}
		d.MCP.Tokens = kept
		d.MCP.UpdatedAt = now
		return nil
	})
	if err != nil {
		logging.Errorf("delete mcp token failed: %v", err)
		writeError(c, http.StatusInternalServerError, "delete mcp token failed")
		return
	}
	if !found {
		logging.Warnf("mcp token delete not found (prefix=%s) from %s", prefix, c.ClientIP())
		writeError(c, http.StatusNotFound, "mcp token not found")
		return
	}

	logging.Infof("mcp token deleted (prefix=%s) from %s", prefix, c.ClientIP())

	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, mcpSettingsView(snap.MCP))
}
