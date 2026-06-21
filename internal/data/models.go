package data

import (
	"encoding/json"
	"time"
)

type StoreData struct {
	Admin     Admin     `json:"admin"`
	Auth      Auth      `json:"auth"`
	MCP       MCPConfig `json:"mcp"`
	Panel     Panel     `json:"panel"`
	Files     []File    `json:"files"`
	NextID    NextID    `json:"next_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// MCPToken 是单个 MCP 凭据的非敏感记录：前缀用于展示与删除定位，Hash 用于校验。
type MCPToken struct {
	Prefix     string    `json:"token_prefix"`
	Hash       string    `json:"token_hash"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
}

// MCPConfig 保存 MCP HTTP 服务的开关与一组 token。
// 明文 token 永不落盘，每个 token 仅保存其前缀（可展示）与 sha256 摘要。
type MCPConfig struct {
	Enabled   bool       `json:"enabled"`
	Tokens    []MCPToken `json:"tokens"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type Admin struct {
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Auth 保存 JWT 签名密钥与 token 撤销版本号。
// 首启时 Secret 为空，由 Store.EnsureSecret 生成并持久化（幂等）。
type Auth struct {
	Secret       string `json:"secret"`
	TokenVersion int    `json:"token_version"`
}

type Panel struct {
	SiteName     string          `json:"site_name"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"search_engine"`
	Groups       []Group         `json:"groups"`
	Items        []Item          `json:"items"`
}

type Group struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon,omitempty"`
	Sort      int       `json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ItemIcon struct {
	ItemType        int    `json:"item_type"`
	Src             string `json:"src,omitempty"`
	Text            string `json:"text,omitempty"`
	Color           string `json:"color,omitempty"`
	BackgroundColor string `json:"background_color,omitempty"`
}

type File struct {
	ID           int       `json:"id"`
	OriginalName string    `json:"original_name"`
	ObjectKey    string    `json:"object_key"`
	MimeType     string    `json:"mime_type"`
	Size         int64     `json:"size"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"created_at"`
}

type NextID struct {
	Group int `json:"group"`
	Item  int `json:"item"`
	File  int `json:"file"`
}
