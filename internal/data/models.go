package data

import (
	"encoding/json"
	"time"
)

type StoreData struct {
	Version   int       `json:"version"`
	Admin     Admin     `json:"admin"`
	Auth      Auth      `json:"auth"`
	MCP       MCPConfig `json:"mcp"`
	Panel     Panel     `json:"panel"`
	Files     []File    `json:"files"`
	NextID    NextID    `json:"next_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// MCPScope 控制某个 MCP token 可执行的操作范围。
type MCPScope string

const (
	MCPScopeReadOnly  MCPScope = "read_only"
	MCPScopeReadWrite MCPScope = "read_write"
)

// MCPConfig 保存 MCP HTTP 服务的开关、权限范围与 token 状态。
// 明文 token 永不落盘，仅保存其前缀与 sha256 摘要。
type MCPConfig struct {
	Enabled     bool      `json:"enabled"`
	TokenHash   string    `json:"token_hash,omitempty"`
	TokenPrefix string    `json:"token_prefix,omitempty"`
	Scope       MCPScope  `json:"scope"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	LastUsedAt  time.Time `json:"last_used_at"`
}

type Admin struct {
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Auth 保存 JWT 签名密钥与 token 撤销版本号。
// 旧数据文件缺此段时为零值，由 Store.EnsureSecret 懒初始化（不 bump dataVersion）。
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
	LANURL      string    `json:"lan_url,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	OpenMethod  string    `json:"open_method"`
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
