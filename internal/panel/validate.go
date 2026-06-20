package panel

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// 字段长度上限（见 plan-1.md Phase 4.4）。
const (
	maxGroupName     = 64
	maxAppTitle      = 128
	maxAppURL        = 2048
	maxAppLANURL     = 2048
	maxDescription   = 512
	maxIconText      = 128
	maxIconSrc       = 2048
	maxPatternLen    = 256
	defaultLimit     = 20
	maxLimit         = 100
	defaultOpenValue = "new_tab"
)

// validOpenMethods 是允许的 open_method 枚举，与 handlers/panel.go 保持一致。
var validOpenMethods = map[string]bool{
	"current": true,
	"new_tab": true,
	"iframe":  true,
}

func isValidOpenMethod(value string) bool {
	return validOpenMethods[value]
}

func runeLen(s string) int {
	return utf8.RuneCountInString(s)
}

// validateGroupName 校验分组名：非空且不超过 64 字符。
func validateGroupName(name string) error {
	if name == "" {
		return fmt.Errorf("group name is required")
	}
	if runeLen(name) > maxGroupName {
		return fmt.Errorf("group name too long (max %d characters)", maxGroupName)
	}
	return nil
}

// validIconColors 是前端编辑器「字体颜色」仅有的两个选项：白与黑。
var validIconColors = map[string]bool{
	"#FFFFFF": true,
	"#000000": true,
}

// validIconBackgroundColors 与前端 ColorSwatchPicker 的快选调色板一致：
// 19 种 Material 主色 + 白/黑，共 21 个。agent 仅可从中选择背景色，
// 不得使用其它颜色（含「更多」对话框里的色阶）。
var validIconBackgroundColors = map[string]bool{
	"#F44336": true, // Red
	"#E91E63": true, // Pink
	"#9C27B0": true, // Purple
	"#673AB7": true, // Deep Purple
	"#3F51B5": true, // Indigo
	"#2196F3": true, // Blue
	"#03A9F4": true, // Light Blue
	"#00BCD4": true, // Cyan
	"#009688": true, // Teal
	"#4CAF50": true, // Green
	"#8BC34A": true, // Light Green
	"#CDDC39": true, // Lime
	"#FFEB3B": true, // Yellow
	"#FFC107": true, // Amber
	"#FF9800": true, // Orange
	"#FF5722": true, // Deep Orange
	"#795548": true, // Brown
	"#9E9E9E": true, // Grey
	"#607D8B": true, // Blue Grey
	"#FFFFFF": true, // White
	"#000000": true, // Black
}

// normalizeHex 将颜色十六进制串归一化为大写，便于与预设集合做大小写不敏感比较。
func normalizeHex(v string) string {
	return strings.ToUpper(v)
}

func isValidIconColor(v string) bool {
	return validIconColors[normalizeHex(v)]
}

func isValidIconBackgroundColor(v string) bool {
	return validIconBackgroundColors[normalizeHex(v)]
}

// validateGroupInput 校验创建分组输入：name 合法、sort 非负。
func validateGroupInput(input GroupInput) error {
	if err := validateGroupName(input.Name); err != nil {
		return err
	}
	if input.Sort < 0 {
		return fmt.Errorf("sort must be non-negative")
	}
	return nil
}

// validateAppPatch 校验部分更新字段：仅检查指针非 nil 的字段。
// Title、URL 为必填字段，显式传空串视为非法；其余可空字段允许清空。
func validateAppPatch(p AppPatch) error {
	if p.Title != nil {
		if *p.Title == "" {
			return fmt.Errorf("item title is required")
		}
		if runeLen(*p.Title) > maxAppTitle {
			return fmt.Errorf("item title too long (max %d characters)", maxAppTitle)
		}
	}
	if p.URL != nil {
		if *p.URL == "" {
			return fmt.Errorf("item url is required")
		}
		if runeLen(*p.URL) > maxAppURL {
			return fmt.Errorf("item url too long (max %d characters)", maxAppURL)
		}
	}
	if p.LANURL != nil && runeLen(*p.LANURL) > maxAppLANURL {
		return fmt.Errorf("item lan_url too long (max %d characters)", maxAppLANURL)
	}
	if p.Description != nil && runeLen(*p.Description) > maxDescription {
		return fmt.Errorf("item description too long (max %d characters)", maxDescription)
	}
	if p.OpenMethod != nil && *p.OpenMethod != "" && !isValidOpenMethod(*p.OpenMethod) {
		return fmt.Errorf("invalid open_method %q", *p.OpenMethod)
	}
	if p.Icon != nil {
		if err := validateAppIcon(*p.Icon); err != nil {
			return err
		}
	}
	if p.Sort != nil && *p.Sort < 0 {
		return fmt.Errorf("sort must be non-negative")
	}
	return nil
}

// Title、URL 必填且非空；open_method 仅允许枚举值或空（空时由调用方补默认）。
func validateAppInput(in AppInput) error {
	if in.Title == "" {
		return fmt.Errorf("item title is required")
	}
	if runeLen(in.Title) > maxAppTitle {
		return fmt.Errorf("item title too long (max %d characters)", maxAppTitle)
	}
	if in.URL == "" {
		return fmt.Errorf("item url is required")
	}
	if runeLen(in.URL) > maxAppURL {
		return fmt.Errorf("item url too long (max %d characters)", maxAppURL)
	}
	if runeLen(in.LANURL) > maxAppLANURL {
		return fmt.Errorf("item lan_url too long (max %d characters)", maxAppLANURL)
	}
	if runeLen(in.Description) > maxDescription {
		return fmt.Errorf("item description too long (max %d characters)", maxDescription)
	}
	if in.OpenMethod != "" && !isValidOpenMethod(in.OpenMethod) {
		return fmt.Errorf("invalid open_method %q", in.OpenMethod)
	}
	if in.Sort < 0 {
		return fmt.Errorf("sort must be non-negative")
	}
	if err := validateAppIcon(in.Icon); err != nil {
		return err
	}
	return nil
}

// validateAppIcon 校验图标子字段。
// color 仅允许白/黑，background_color 仅允许 21 个预设色，与前端编辑器快选调色板一致；
// 空值视为不设置，跳过校验。
func validateAppIcon(icon AppIcon) error {
	if runeLen(icon.Text) > maxIconText {
		return fmt.Errorf("icon text too long (max %d characters)", maxIconText)
	}
	if runeLen(icon.Src) > maxIconSrc {
		return fmt.Errorf("icon src too long (max %d characters)", maxIconSrc)
	}
	if icon.Color != "" && !isValidIconColor(icon.Color) {
		return fmt.Errorf("invalid icon color %q: must be #FFFFFF or #000000", icon.Color)
	}
	if icon.BackgroundColor != "" && !isValidIconBackgroundColor(icon.BackgroundColor) {
		return fmt.Errorf("invalid icon background_color %q: must be one of the 21 preset colors", icon.BackgroundColor)
	}
	return nil
}

// normalizeOpenMethod 将空 open_method 补为默认值 new_tab。
func normalizeOpenMethod(value string) string {
	if value == "" {
		return defaultOpenValue
	}
	return value
}

// validateSearchPattern 校验正则 pattern 长度。
func validateSearchPattern(pattern string) error {
	if runeLen(pattern) > maxPatternLen {
		return fmt.Errorf("search pattern too long (max %d characters)", maxPatternLen)
	}
	return nil
}

// normalizeSearchLimit 将 limit 归一化到 [1, maxLimit]，缺省（<=0）取 defaultLimit。
func normalizeSearchLimit(limit int) int {
	if limit <= 0 {
		return defaultLimit
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}
