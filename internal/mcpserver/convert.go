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

// toPanelReplaceInput 将替换应用的 MCP 入参转为 panel.AppInput。
func toPanelReplaceInput(in ReplaceAppInput) panel.AppInput {
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
		Sort:        in.Sort,
	}
}

// toPanelGroupInput 将创建分组的 MCP 入参转为 panel.GroupInput。
func toPanelGroupInput(in CreateGroupInput) panel.GroupInput {
	return panel.GroupInput{Name: in.Name, Sort: in.Sort}
}

// iconToPanel 将 MCP 图标 DTO 转为 panel.AppIcon；nil 视为空图标。
// 历史字段 item_type/src 不再映射到领域模型，仅保留在 DTO 上待下个 commit 删除。
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

// normalizeIconItemType 把 MCP 入参的 item_type 归一化到前端 ItemIcon 能渲染的语义：
// 1=纯文本、2=图片（需 src）、3=iconify（需 text，如 mdi:git）。
//
// 前端对 0 或未知 item_type 不渲染图标，且历史上 agent 曾按错误描述把 iconify
// 图标设为 2（图片），导致前端拿 mdi 名当图片 URL 渲染而空白。这里在写入前纠正：
//   - 1/3 原样保留；
//   - 2 仅在确有 src 时保留为图片，否则按 iconify(3) 处理；
//   - 0/未知按字段推断：有 src→2，有 text→3，都没有→0（无图标）。
func normalizeIconItemType(itemType int, src, text string) int {
	switch itemType {
	case 1, 3:
		return itemType
	case 2:
		if src != "" {
			return 2
		}
		return 3
	default:
		if src != "" {
			return 2
		}
		if text != "" {
			return 3
		}
		return 0
	}
}
