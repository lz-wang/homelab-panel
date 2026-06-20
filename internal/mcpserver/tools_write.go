package mcpserver

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"homelab-panel/internal/logging"
	"homelab-panel/internal/panel"
)

// auditToolCall 记录一次写工具调用。审计日志统一走 internal/logging 单行英文格式，
// 不记录 token、完整 Authorization 头或敏感内网地址。
func auditToolCall(ctx context.Context, tool, targetType string, targetID int, success bool) {
	logging.Infof("mcp tool call: tool=%s target=%s:%d success=%t remote_ip=%s",
		tool, targetType, targetID, success, RemoteAddrFromContext(ctx))
}

// registerWriteTools 注册 5 个写入工具。已通过 MCP 鉴权即可调用。
func registerWriteTools(s *mcp.Server, panelSvc *panel.Service) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_rename_group",
		Title:       "Rename HomeLab Panel group",
		Description: "Rename a HomeLab Panel group.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in RenameGroupInput) (*mcp.CallToolResult, RenameGroupOutput, error) {
		group, err := panelSvc.RenameGroup(ctx, in.GroupID, in.Name)
		if err != nil {
			return nil, RenameGroupOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_rename_group", "group", group.ID, true)
		return nil, RenameGroupOutput{Group: *group}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_create_group",
		Title:       "Create HomeLab Panel group",
		Description: "Create a new group. The group id is allocated by the server.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  false,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in CreateGroupInput) (*mcp.CallToolResult, CreateGroupOutput, error) {
		group, err := panelSvc.CreateGroup(ctx, toPanelGroupInput(in))
		if err != nil {
			return nil, CreateGroupOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_create_group", "group", group.ID, true)
		return nil, CreateGroupOutput{Group: *group}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_create_app",
		Title:       "Create HomeLab Panel app",
		Description: "Create a new app in a group. The app id is allocated by the server.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  false,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in CreateAppInput) (*mcp.CallToolResult, CreateAppOutput, error) {
		item, err := panelSvc.CreateApp(ctx, toPanelCreateInput(in))
		if err != nil {
			return nil, CreateAppOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_create_app", "app", item.ID, true)
		return nil, CreateAppOutput{Item: *item}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_replace_app",
		Title:       "Replace HomeLab Panel app",
		Description: "Replace the full configuration of an app by its id.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(true),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in ReplaceAppInput) (*mcp.CallToolResult, ReplaceAppOutput, error) {
		item, err := panelSvc.ReplaceApp(ctx, in.ID, toPanelReplaceInput(in))
		if err != nil {
			return nil, ReplaceAppOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_replace_app", "app", item.ID, true)
		return nil, ReplaceAppOutput{Item: *item}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_patch_app",
		Title:       "Patch HomeLab Panel app",
		Description: "Patch selected fields of an app by its id.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in PatchAppInput) (*mcp.CallToolResult, PatchAppOutput, error) {
		item, err := panelSvc.PatchApp(ctx, in.ID, toPanelPatchInput(in))
		if err != nil {
			return nil, PatchAppOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_patch_app", "app", item.ID, true)
		return nil, PatchAppOutput{Item: *item}, nil
	})
}
