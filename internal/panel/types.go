package panel

import (
	"errors"
	"time"
)

// AppIcon 描述应用图标，与 data.ItemIcon 字段一一对应。
// Text 为 Iconify identifier（如 mdi:server-network）；零值表示无图标。
type AppIcon struct {
	Text            string `json:"text,omitempty"`
	Color           string `json:"color,omitempty"`
	BackgroundColor string `json:"background_color,omitempty"`
}

// GroupSummary 是分组的精简视图，不含其下应用。
type GroupSummary struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
	Sort int    `json:"sort"`
}

// AppSummary 是应用的精简视图，用于列表与搜索结果。
type AppSummary struct {
	ID          int    `json:"id"`
	GroupID     int    `json:"group_id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Sort        int    `json:"sort"`
}

// AppDetail 是应用的完整配置。
type AppDetail struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	BackupURL   string    `json:"backup_url,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        AppIcon   `json:"icon"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AppInput 用于 CreateApp 与 ReplaceApp 的完整应用输入。
type AppInput struct {
	GroupID     int
	Title       string
	URL         string
	BackupURL   string
	Description string
	Icon        AppIcon
	Sort        int
}

// AppPatch 用指针字段表达部分更新语义：
//
//	指针为 nil   -> 不修改该字段
//	指针指向空串 -> 显式清空该字段（仅对可空字段合法）
//	指针指向非空  -> 更新为新值
type AppPatch struct {
	GroupID     *int
	Title       *string
	URL         *string
	BackupURL   *string
	Description *string
	Icon        *AppIcon
	Sort        *int
}

// GroupInput 用于 CreateGroup 的分组输入。
type GroupInput struct {
	Name string
	Sort int
}

// 业务错误。MCP 工具把这些作为 tool error 返回给客户端。
var (
	ErrGroupNotFound = errors.New("group not found")
	ErrAppNotFound   = errors.New("app not found")
)
