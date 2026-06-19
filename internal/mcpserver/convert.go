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
		LANURL:      in.LANURL,
		Description: in.Description,
		Icon:        iconToPanel(in.Icon),
		OpenMethod:  in.OpenMethod,
		Sort:        in.Sort,
	}
}

// toPanelReplaceInput 将替换应用的 MCP 入参转为 panel.AppInput。
func toPanelReplaceInput(in ReplaceAppInput) panel.AppInput {
	return panel.AppInput{
		GroupID:     in.GroupID,
		Title:       in.Title,
		URL:         in.URL,
		LANURL:      in.LANURL,
		Description: in.Description,
		Icon:        iconToPanel(in.Icon),
		OpenMethod:  in.OpenMethod,
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
		LANURL:      in.LANURL,
		Description: in.Description,
		Icon:        icon,
		OpenMethod:  in.OpenMethod,
		Sort:        in.Sort,
	}
}

// iconToPanel 将 MCP 图标 DTO 转为 panel.AppIcon；nil 视为空图标。
func iconToPanel(icon *AppIcon) panel.AppIcon {
	if icon == nil {
		return panel.AppIcon{}
	}
	return panel.AppIcon{
		ItemType:        icon.ItemType,
		Src:             icon.Src,
		Text:            icon.Text,
		Color:           icon.Color,
		BackgroundColor: icon.BackgroundColor,
	}
}
