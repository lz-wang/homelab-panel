package mcpserver

import "homelab-panel/internal/panel"

// MCP 工具的输入/输出 DTO。
//
// 输入 DTO 为 mcpserver 独有结构体，带 jsonschema 描述供客户端推导参数；
// 输出 DTO 直接复用 panel 包的值类型，避免无意义的只读转换。

// EmptyInput 表示工具不接受任何参数。
type EmptyInput struct{}

// AppIcon 描述应用图标，字段与 panel.AppIcon 对齐。
type AppIcon struct {
	ItemType        int    `json:"item_type,omitempty" jsonschema:"icon item type (0 plain text, 1 image, 2 iconify, 3 mixed)"`
	Src             string `json:"src,omitempty" jsonschema:"image url or data url for image icons"`
	Text            string `json:"text,omitempty" jsonschema:"iconify icon name or text label"`
	Color           string `json:"color,omitempty" jsonschema:"foreground color"`
	BackgroundColor string `json:"background_color,omitempty" jsonschema:"icon background color"`
}

// ---- 只读输入 ----

type ListAppsByGroupInput struct {
	GroupID int `json:"group_id" jsonschema:"target group id"`
}

type SearchAppsInput struct {
	Pattern       string `json:"pattern" jsonschema:"regular expression matched against title, description or icon text"`
	CaseSensitive bool   `json:"case_sensitive,omitempty" jsonschema:"whether the regexp is case sensitive"`
	Limit         int    `json:"limit,omitempty" jsonschema:"max result count, default 20, max 100"`
}

type GetAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`
}

// ---- 写入输入 ----

type RenameGroupInput struct {
	GroupID int    `json:"group_id" jsonschema:"target group id"`
	Name    string `json:"name" jsonschema:"new group name"`
}

type CreateAppInput struct {
	GroupID     int      `json:"group_id" jsonschema:"target group id"`
	Title       string   `json:"title" jsonschema:"app title"`
	URL         string   `json:"url" jsonschema:"app url"`
	LANURL      string   `json:"lan_url,omitempty" jsonschema:"optional lan url"`
	Description string   `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	OpenMethod  string   `json:"open_method,omitempty" jsonschema:"how to open the app: current, new_tab or iframe"`
	Sort        int      `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

type ReplaceAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     int      `json:"group_id" jsonschema:"target group id"`
	Title       string   `json:"title" jsonschema:"app title"`
	URL         string   `json:"url" jsonschema:"app url"`
	LANURL      string   `json:"lan_url,omitempty" jsonschema:"optional lan url"`
	Description string   `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	OpenMethod  string   `json:"open_method,omitempty" jsonschema:"how to open the app: current, new_tab or iframe"`
	Sort        int      `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

// PatchAppInput 用指针字段区分「不修改 / 显式清空 / 更新为新值」。
type PatchAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     *int     `json:"group_id,omitempty" jsonschema:"target group id"`
	Title       *string  `json:"title,omitempty" jsonschema:"app title"`
	URL         *string  `json:"url,omitempty" jsonschema:"app url"`
	LANURL      *string  `json:"lan_url,omitempty" jsonschema:"optional lan url"`
	Description *string  `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	OpenMethod  *string  `json:"open_method,omitempty" jsonschema:"how to open the app: current, new_tab or iframe"`
	Sort        *int     `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

// ---- 输出（复用 panel 值类型） ----

type ListGroupsOutput struct {
	Groups []panel.GroupSummary `json:"groups"`
}

type ListAppsByGroupOutput struct {
	Items []panel.AppSummary `json:"items"`
}

type SearchAppsOutput struct {
	Items []panel.AppSummary `json:"items"`
}

type GetAppOutput struct {
	Item panel.AppDetail `json:"item"`
}

type RenameGroupOutput struct {
	Group panel.GroupSummary `json:"group"`
}

type CreateAppOutput struct {
	Item panel.AppDetail `json:"item"`
}

type ReplaceAppOutput struct {
	Item panel.AppDetail `json:"item"`
}

type PatchAppOutput struct {
	Item panel.AppDetail `json:"item"`
}
