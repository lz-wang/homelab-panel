package panel

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// 字段长度上限（见 plan-1.md Phase 4.4）。
const (
	maxGroupName   = 64
	maxAppTitle    = 128
	maxAppURL      = 2048
	maxDescription = 512
	maxIconText    = 128
	maxPatternLen  = 256
	defaultLimit   = 20
	maxLimit       = 100
)

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

// validateGroupPatch 仅校验实际传入的分组字段。图标沿用 Web 现有契约，允许任意字符串和空串。
func validateGroupPatch(p GroupPatch) error {
	if p.Name != nil {
		if err := validateGroupName(*p.Name); err != nil {
			return err
		}
	}
	if p.Sort != nil && *p.Sort < 0 {
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
	if p.BackupURL != nil && *p.BackupURL != "" && runeLen(*p.BackupURL) > maxAppURL {
		return fmt.Errorf("item backup_url too long (max %d characters)", maxAppURL)
	}
	if p.Description != nil && runeLen(*p.Description) > maxDescription {
		return fmt.Errorf("item description too long (max %d characters)", maxDescription)
	}
	if p.Icon != nil {
		if err := ValidateAppIcon(*p.Icon); err != nil {
			return err
		}
	}
	if p.Sort != nil && *p.Sort < 0 {
		return fmt.Errorf("sort must be non-negative")
	}
	return nil
}

// Title、URL 必填且非空。
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
	if runeLen(in.BackupURL) > maxAppURL {
		return fmt.Errorf("item backup_url too long (max %d characters)", maxAppURL)
	}
	if runeLen(in.Description) > maxDescription {
		return fmt.Errorf("item description too long (max %d characters)", maxDescription)
	}
	if in.Sort < 0 {
		return fmt.Errorf("sort must be non-negative")
	}
	if err := ValidateAppIcon(in.Icon); err != nil {
		return err
	}
	return nil
}

// ValidateAppIcon 校验 Iconify-only 应用图标。
// 零值表示无图标；非零图标必须包含 prefix:name 形式的 Iconify identifier。
func ValidateAppIcon(icon AppIcon) error {
	if icon == (AppIcon{}) {
		return nil
	}
	if strings.TrimSpace(icon.Text) == "" {
		return fmt.Errorf("icon text is required")
	}
	if !isIconifyName(icon.Text) {
		return fmt.Errorf("icon text %q must be an Iconify name like mdi:home", icon.Text)
	}
	if runeLen(icon.Text) > maxIconText {
		return fmt.Errorf("icon text too long (max %d characters)", maxIconText)
	}
	if icon.Color != "" && !isValidIconColor(icon.Color) {
		return fmt.Errorf("invalid icon color %q: must be #FFFFFF or #000000", icon.Color)
	}
	if icon.BackgroundColor != "" && !isValidIconBackgroundColor(icon.BackgroundColor) {
		return fmt.Errorf(
			"invalid icon background_color %q: must be one of the 21 preset colors",
			icon.BackgroundColor,
		)
	}
	return nil
}

// isIconifyName 做最轻量的 Iconify identifier 形状校验：必须形如 prefix:name。
// 不做网络校验、不校验图标是否真实存在。
func isIconifyName(v string) bool {
	prefix, name, ok := strings.Cut(v, ":")
	return ok && prefix != "" && name != ""
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
