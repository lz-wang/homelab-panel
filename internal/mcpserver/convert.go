package mcpserver

import "homelab-panel/internal/panel"

// MCP 输入 DTO -> panel 输入 的转换层。
//
// 保持 MCP 工具入参与 panel 业务输入解耦：MCP DTO 负责协议层 jsonschema 描述，
// panel.AppInput/AppPatch 负责业务校验。两侧字段未来若分化，改动集中在本文件。

// toPanelCreateInput 将创建应用的 MCP 入参转为 panel.AppInput。
func toPanelCreateInput(in CreateAppInput) panel.AppInput {
	return panel.AppInput{
		GroupID:     in.GroupID,
		Title:       in.Title,
		URL:         in.URL,
		BackupURL:   in.BackupURL,
		Description: in.Description,
		Icon:        iconToPanel(in.Icon),
		Sort:        in.Sort,
	}
}

// toPanelPatchInput 将部分更新的 MCP 入参转为 panel.AppPatch。
func toPanelPatchInput(in PatchAppInput) panel.AppPatch {
	var icon *panel.AppIcon
	if in.Icon != nil {
		ic := iconToPanel(in.Icon)
		icon = &ic
	}
	return panel.AppPatch{
		GroupID:     in.GroupID,
		Title:       in.Title,
		URL:         in.URL,
		BackupURL:   in.BackupURL,
		Description: in.Description,
		Icon:        icon,
		ClearIcon:   in.ClearIcon,
		Sort:        in.Sort,
	}
}

// toPanelGroupInput 将创建分组的 MCP 入参转为 panel.GroupInput。
func toPanelGroupInput(in CreateGroupInput) panel.GroupInput {
	return panel.GroupInput{Name: in.Name, Icon: in.Icon, Sort: in.Sort}
}

func toPanelGroupPatch(in PatchGroupInput) panel.GroupPatch {
	return panel.GroupPatch{Name: in.Name, Icon: in.Icon, Sort: in.Sort}
}

func toPanelSettingsPatch(in PatchSettingsInput) panel.PanelSettingsPatch {
	return panel.PanelSettingsPatch{SiteName: in.SiteName, BackgroundImageSrc: in.BackgroundImageSrc, BackgroundBlur: in.BackgroundBlur, BackgroundMaskNumber: in.BackgroundMaskNumber, IconTextInfoShowDescription: in.IconTextInfoShowDescription, LogoText: in.LogoText, ClockShow: in.ClockShow, ClockShowSecond: in.ClockShowSecond, SearchBoxShow: in.SearchBoxShow, MarginTop: in.MarginTop, MarginBottom: in.MarginBottom, MarginX: in.MarginX, AppCardRadius: in.AppCardRadius, AppCardAspectRatio: in.AppCardAspectRatio, AppCardDefaultColor: in.AppCardDefaultColor, FaviconSrc: in.FaviconSrc}
}

// iconToPanel 将 MCP 图标 DTO 转为 panel.AppIcon；nil 视为空图标。
func iconToPanel(icon *AppIcon) panel.AppIcon {
	if icon == nil {
		return panel.AppIcon{}
	}
	return panel.AppIcon{
		Text:            icon.Text,
		Color:           icon.Color,
		BackgroundColor: icon.BackgroundColor,
	}
}
