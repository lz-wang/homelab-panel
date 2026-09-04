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

// registerWriteTools 注册写入工具。已通过 MCP 鉴权即可调用。
func registerWriteTools(s *mcp.Server, panelSvc *panel.Service) {
	mcp.AddTool(s, &mcp.Tool{
		Name: "homelab_panel_reorder_groups", Title: "Reorder HomeLab Panel groups",
		Description: "Atomically reorder groups. IDs must contain every current group exactly once.",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: false, DestructiveHint: ptr(false), IdempotentHint: true},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in ReorderGroupsInput) (*mcp.CallToolResult, ReorderGroupsOutput, error) {
		groups, err := panelSvc.ReorderGroups(ctx, in.GroupIDs)
		if err != nil {
			return nil, ReorderGroupsOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_reorder_groups", "groups", 0, true)
		return nil, ReorderGroupsOutput{Groups: groups}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name: "homelab_panel_reorder_apps", Title: "Reorder HomeLab Panel apps",
		Description: "Atomically reorder apps in one group. IDs must contain every current app in that group exactly once.",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: false, DestructiveHint: ptr(false), IdempotentHint: true},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in ReorderAppsInput) (*mcp.CallToolResult, ReorderAppsOutput, error) {
		items, err := panelSvc.ReorderApps(ctx, in.GroupID, in.AppIDs)
		if err != nil {
			return nil, ReorderAppsOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_reorder_apps", "group", in.GroupID, true)
		return nil, ReorderAppsOutput{Items: items}, nil
	})
	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_patch_group",
		Title:       "Patch HomeLab Panel group",
		Description: "Patch selected fields of a HomeLab Panel group by its id.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in PatchGroupInput) (*mcp.CallToolResult, PatchGroupOutput, error) {
		group, err := panelSvc.PatchGroup(ctx, in.GroupID, toPanelGroupPatch(in))
		if err != nil {
			return nil, PatchGroupOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_patch_group", "group", group.ID, true)
		return nil, PatchGroupOutput{Group: *group}, nil
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
		Name: "homelab_panel_delete_group", Title: "Delete HomeLab Panel group",
		Description: "Delete an empty group by id. This never cascades to apps; move or delete its apps first.",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: false, DestructiveHint: ptr(true), IdempotentHint: true},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in DeleteGroupInput) (*mcp.CallToolResult, EmptyInput, error) {
		err := panelSvc.DeleteGroup(ctx, in.GroupID)
		if err != nil {
			return nil, EmptyInput{}, err
		}
		auditToolCall(ctx, "homelab_panel_delete_group", "group", in.GroupID, true)
		return nil, EmptyInput{}, nil
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
		Name: "homelab_panel_delete_app", Title: "Delete HomeLab Panel app",
		Description: "Delete an app by id.",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: false, DestructiveHint: ptr(true), IdempotentHint: true},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in DeleteAppInput) (*mcp.CallToolResult, EmptyInput, error) {
		if err := panelSvc.DeleteApp(ctx, in.ID); err != nil {
			return nil, EmptyInput{}, err
		}
		auditToolCall(ctx, "homelab_panel_delete_app", "app", in.ID, true)
		return nil, EmptyInput{}, nil
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
