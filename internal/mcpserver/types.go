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
	Pattern       string `json:"pattern" jsonschema:"regular expression matched against title, description, URL, backup URL, or Iconify icon name"`
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

// PatchAppInput 用指针字段区分「不修改 / 显式清空 / 更新为新值」。
type PatchAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     *int     `json:"group_id,omitempty" jsonschema:"target group id"`
	Title       *string  `json:"title,omitempty" jsonschema:"app title"`
	URL         *string  `json:"url,omitempty" jsonschema:"app url"`
	BackupURL   *string  `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode; empty string clears it"`
	Description *string  `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	ClearIcon   *bool    `json:"clear_icon,omitempty" jsonschema:"set true to remove the current icon; cannot be used with icon"`
	Sort        *int     `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

type DeleteAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`
}

type ReorderGroupsInput struct {
	GroupIDs []int `json:"group_ids" jsonschema:"IDs must contain every current group exactly once, in the desired order"`
}

type ReorderAppsInput struct {
	GroupID int   `json:"group_id" jsonschema:"target group id"`
	AppIDs  []int `json:"app_ids" jsonschema:"IDs must contain every current app in this group exactly once, in the desired order"`
}

// PatchSettingsInput 将所有可管理的 settings 展开为 schema 字段，避免无约束 JSON object。
type PatchSettingsInput struct {
	SiteName                    *string  `json:"site_name,omitempty" jsonschema:"site name"`
	BackgroundImageSrc          *string  `json:"background_image_src,omitempty" jsonschema:"background image URL or path"`
	BackgroundBlur              *float64 `json:"background_blur,omitempty" jsonschema:"background blur between 0 and 20"`
	BackgroundMaskNumber        *float64 `json:"background_mask_number,omitempty" jsonschema:"background mask opacity between 0 and 1"`
	IconTextInfoShowDescription *bool    `json:"icon_text_info_show_description,omitempty" jsonschema:"show app descriptions"`
	LogoText                    *string  `json:"logo_text,omitempty" jsonschema:"logo text"`
	ClockShow                   *bool    `json:"clock_show,omitempty" jsonschema:"show clock"`
	ClockShowSecond             *bool    `json:"clock_show_second,omitempty" jsonschema:"show clock seconds"`
	SearchBoxShow               *bool    `json:"search_box_show,omitempty" jsonschema:"show search box"`
	MarginTop                   *float64 `json:"margin_top,omitempty" jsonschema:"top margin between 0 and 30"`
	MarginBottom                *float64 `json:"margin_bottom,omitempty" jsonschema:"bottom margin between 0 and 30"`
	MarginX                     *float64 `json:"margin_x,omitempty" jsonschema:"horizontal margin between 0 and 20"`
	AppCardRadius               *float64 `json:"app_card_radius,omitempty" jsonschema:"card radius between 0 and 64"`
	AppCardAspectRatio          *string  `json:"app_card_aspect_ratio,omitempty" jsonschema:"one of auto, 16 / 9, 2 / 1, 5 / 2, 3 / 1"`
	AppCardDefaultColor         *string  `json:"app_card_default_color,omitempty" jsonschema:"six-digit hex color"`
	FaviconSrc                  *string  `json:"favicon_src,omitempty" jsonschema:"http(s), /uploads/, data:image/, or empty to clear"`
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

type PatchAppOutput struct {
	Item panel.AppDetail `json:"item"`
}

type ReorderGroupsOutput struct {
	Groups []panel.GroupSummary `json:"groups"`
}
type ReorderAppsOutput struct {
	Items []panel.AppSummary `json:"items"`
}

type PatchSettingsOutput struct {
	Settings panel.PanelSettings `json:"settings"`
}
