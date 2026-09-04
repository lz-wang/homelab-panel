package mcpserver

import "homelab-panel/internal/panel"

// MCP 工具的输入/输出 DTO。
//
// 输入 DTO 为 mcpserver 独有结构体，带 jsonschema 描述供客户端推导参数；
// 输出 DTO 直接复用 panel 包的值类型，避免无意义的只读转换。

// EmptyInput 表示工具不接受任何参数。
type EmptyInput struct{}

// AppIcon 描述应用图标，仅支持 Iconify，字段与 panel.AppIcon 对齐。
type AppIcon struct {
	Text            string `json:"text" jsonschema:"Iconify icon name, e.g. mdi:git"`
	Color           string `json:"color,omitempty" jsonschema:"foreground (text) color; must be #FFFFFF or #000000 (case-insensitive)"`
	BackgroundColor string `json:"background_color,omitempty" jsonschema:"icon background color; must be one of the 21 presets (case-insensitive): #F44336 #E91E63 #9C27B0 #673AB7 #3F51B5 #2196F3 #03A9F4 #00BCD4 #009688 #4CAF50 #8BC34A #CDDC39 #FFEB3B #FFC107 #FF9800 #FF5722 #795548 #9E9E9E #607D8B #FFFFFF #000000"`
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

type CreateGroupInput struct {
	Name string `json:"name" jsonschema:"new group name (required)"`
	Icon string `json:"icon,omitempty" jsonschema:"optional group icon; empty string means no icon"`
	Sort int    `json:"sort,omitempty" jsonschema:"optional sort order, non-negative integer; omit to append at the end"`
}

type PatchGroupInput struct {
	GroupID int     `json:"group_id" jsonschema:"target group id"`
	Name    *string `json:"name,omitempty" jsonschema:"new group name"`
	Icon    *string `json:"icon,omitempty" jsonschema:"group icon; empty string clears it"`
	Sort    *int    `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

type DeleteGroupInput struct {
	GroupID int `json:"group_id" jsonschema:"target group id; deletion is rejected while it still contains apps"`
}

type CreateAppInput struct {
	GroupID     int      `json:"group_id" jsonschema:"target group id"`
	Title       string   `json:"title" jsonschema:"app title"`
	URL         string   `json:"url" jsonschema:"app url"`
	BackupURL   string   `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode"`
	Description string   `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	Sort        int      `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

type ReplaceAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     int      `json:"group_id" jsonschema:"target group id"`
	Title       string   `json:"title" jsonschema:"app title"`
	URL         string   `json:"url" jsonschema:"app url"`
	BackupURL   string   `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode"`
	Description string   `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	Sort        int      `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

// PatchAppInput 用指针字段区分「不修改 / 显式清空 / 更新为新值」。
type PatchAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     *int     `json:"group_id,omitempty" jsonschema:"target group id"`
	Title       *string  `json:"title,omitempty" jsonschema:"app title"`
	URL         *string  `json:"url,omitempty" jsonschema:"app url"`
	BackupURL   *string  `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode; empty string clears it"`
	Description *string  `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
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

type GetPanelOutput struct {
	Panel panel.PanelSnapshot `json:"panel"`
}

type ListFilesOutput struct {
	Files []panel.FileSummary `json:"files"`
}

type CreateGroupOutput struct {
	Group panel.GroupSummary `json:"group"`
}

type PatchGroupOutput struct {
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
