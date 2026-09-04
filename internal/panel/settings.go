package panel

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strings"
)

// PanelConfig 是当前产品支持的面板设置。持久化仍使用 JSON，避免引入数据迁移。
type PanelConfig struct {
	BackgroundImageSrc          string  `json:"background_image_src"`
	BackgroundBlur              float64 `json:"background_blur"`
	BackgroundMaskNumber        float64 `json:"background_mask_number"`
	IconTextInfoShowDescription bool    `json:"icon_text_info_show_description"`
	LogoText                    string  `json:"logo_text"`
	ClockShow                   bool    `json:"clock_show"`
	ClockShowSecond             bool    `json:"clock_show_second"`
	SearchBoxShow               bool    `json:"search_box_show"`
	MarginTop                   float64 `json:"margin_top"`
	MarginBottom                float64 `json:"margin_bottom"`
	MarginX                     float64 `json:"margin_x"`
	AppCardRadius               float64 `json:"app_card_radius"`
	AppCardAspectRatio          string  `json:"app_card_aspect_ratio"`
	AppCardDefaultColor         string  `json:"app_card_default_color"`
	FaviconSrc                  string  `json:"favicon_src"`
}

type PanelSettings struct {
	SiteName string      `json:"site_name"`
	Config   PanelConfig `json:"config"`
}

// PanelSettingsPatch 只暴露已定义业务语义的设置字段。
type PanelSettingsPatch struct {
	SiteName                    *string
	BackgroundImageSrc          *string
	BackgroundBlur              *float64
	BackgroundMaskNumber        *float64
	IconTextInfoShowDescription *bool
	LogoText                    *string
	ClockShow                   *bool
	ClockShowSecond             *bool
	SearchBoxShow               *bool
	MarginTop                   *float64
	MarginBottom                *float64
	MarginX                     *float64
	AppCardRadius               *float64
	AppCardAspectRatio          *string
	AppCardDefaultColor         *string
	FaviconSrc                  *string
}

func defaultPanelConfig() PanelConfig {
	return PanelConfig{BackgroundImageSrc: "/backgrounds/background-md.jpg", LogoText: "Homelab Panel", ClockShow: true, SearchBoxShow: true, MarginTop: 3, MarginBottom: 2, MarginX: 5, AppCardRadius: 20, AppCardAspectRatio: "auto", AppCardDefaultColor: "#2196F3"}
}

// DecodePanelConfig 解码历史 raw JSON；缺失字段采用产品默认值。
func DecodePanelConfig(raw json.RawMessage) (PanelConfig, error) {
	cfg := defaultPanelConfig()
	if len(raw) == 0 || string(raw) == "null" {
		return cfg, nil
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&cfg); err != nil {
		return PanelConfig{}, fmt.Errorf("decode panel config: %w", err)
	}
	return cfg, ValidatePanelConfig(cfg)
}

func EncodePanelConfig(cfg PanelConfig) (json.RawMessage, error) {
	if err := ValidatePanelConfig(cfg); err != nil {
		return nil, err
	}
	b, err := json.Marshal(cfg)
	if err != nil {
		return nil, fmt.Errorf("encode panel config: %w", err)
	}
	return b, nil
}

var validAspectRatios = map[string]bool{"auto": true, "16 / 9": true, "2 / 1": true, "5 / 2": true, "3 / 1": true}
var hexColor = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

func ValidatePanelConfig(cfg PanelConfig) error {
	if runeLen(cfg.BackgroundImageSrc) > maxAppURL {
		return fmt.Errorf("background image source too long")
	}
	if runeLen(cfg.LogoText) > maxAppTitle {
		return fmt.Errorf("logo text too long")
	}
	for _, field := range []struct {
		name            string
		value, min, max float64
	}{
		{"background blur", cfg.BackgroundBlur, 0, 20}, {"background mask number", cfg.BackgroundMaskNumber, 0, 1}, {"margin top", cfg.MarginTop, 0, 30}, {"margin bottom", cfg.MarginBottom, 0, 30}, {"margin x", cfg.MarginX, 0, 20}, {"app card radius", cfg.AppCardRadius, 0, 64},
	} {
		if math.IsNaN(field.value) || math.IsInf(field.value, 0) || field.value < field.min || field.value > field.max {
			return fmt.Errorf("%s must be between %g and %g", field.name, field.min, field.max)
		}
	}
	if !validAspectRatios[cfg.AppCardAspectRatio] {
		return fmt.Errorf("invalid app card aspect ratio")
	}
	if !hexColor.MatchString(cfg.AppCardDefaultColor) {
		return fmt.Errorf("invalid app card default color")
	}
	if cfg.FaviconSrc != "" && !isAllowedFavicon(cfg.FaviconSrc) {
		return fmt.Errorf("invalid favicon source")
	}
	return nil
}

func isAllowedFavicon(v string) bool {
	return strings.HasPrefix(strings.ToLower(v), "http://") || strings.HasPrefix(strings.ToLower(v), "https://") || strings.HasPrefix(v, "/uploads/") || strings.HasPrefix(strings.ToLower(v), "data:image/")
}

// ApplyPanelSettingsPatch 校验后将部分设置应用到当前值。
func ApplyPanelSettingsPatch(settings PanelSettings, patch PanelSettingsPatch) (PanelSettings, error) {
	if patch.SiteName != nil {
		settings.SiteName = *patch.SiteName
	}
	c := &settings.Config
	if patch.BackgroundImageSrc != nil {
		c.BackgroundImageSrc = *patch.BackgroundImageSrc
	}
	if patch.BackgroundBlur != nil {
		c.BackgroundBlur = *patch.BackgroundBlur
	}
	if patch.BackgroundMaskNumber != nil {
		c.BackgroundMaskNumber = *patch.BackgroundMaskNumber
	}
	if patch.IconTextInfoShowDescription != nil {
		c.IconTextInfoShowDescription = *patch.IconTextInfoShowDescription
	}
	if patch.LogoText != nil {
		c.LogoText = *patch.LogoText
	}
	if patch.ClockShow != nil {
		c.ClockShow = *patch.ClockShow
	}
	if patch.ClockShowSecond != nil {
		c.ClockShowSecond = *patch.ClockShowSecond
	}
	if patch.SearchBoxShow != nil {
		c.SearchBoxShow = *patch.SearchBoxShow
	}
	if patch.MarginTop != nil {
		c.MarginTop = *patch.MarginTop
	}
	if patch.MarginBottom != nil {
		c.MarginBottom = *patch.MarginBottom
	}
	if patch.MarginX != nil {
		c.MarginX = *patch.MarginX
	}
	if patch.AppCardRadius != nil {
		c.AppCardRadius = *patch.AppCardRadius
	}
	if patch.AppCardAspectRatio != nil {
		c.AppCardAspectRatio = *patch.AppCardAspectRatio
	}
	if patch.AppCardDefaultColor != nil {
		c.AppCardDefaultColor = *patch.AppCardDefaultColor
	}
	if patch.FaviconSrc != nil {
		c.FaviconSrc = *patch.FaviconSrc
	}
	if runeLen(settings.SiteName) > maxGroupName {
		return PanelSettings{}, fmt.Errorf("site name too long")
	}
	if err := ValidatePanelConfig(*c); err != nil {
		return PanelSettings{}, err
	}
	return settings, nil
}
