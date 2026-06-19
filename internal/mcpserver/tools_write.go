package mcpserver

import (
	"context"
	"fmt"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"homelab-panel/internal/logging"
	"homelab-panel/internal/panel"
)

// requireWriteScope 校验当前请求具备读写权限。SDK 会把返回的 error 作为 tool error
// 返回给客户端（IsError=true），适合 permission denied 这类业务错误。
func requireWriteScope(ctx context.Context) error {
	if ScopeFromContext(ctx) != scopeReadWrite {
		return fmt.Errorf("permission denied: read_write scope required")
	}
	return nil
}

// auditToolCall 记录一次写工具调用。审计日志统一走 internal/logging 单行英文格式，
// 不记录 token、完整 Authorization 头或敏感内网地址。
func auditToolCall(ctx context.Context, tool, targetType string, targetID int, success bool) {
	logging.Infof("mcp tool call: tool=%s target=%s:%d success=%t remote_ip=%s",
		tool, targetType, targetID, success, RemoteAddrFromContext(ctx))
}

// registerWriteTools 注册 4 个写入工具，均要求 read_write scope。
func registerWriteTools(s *mcp.Server, panelSvc *panel.Service) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_rename_group",
		Title:       "Rename HomeLab Panel group",
		Description: "Rename a HomeLab Panel group. Requires the read_write MCP scope.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in RenameGroupInput) (*mcp.CallToolResult, RenameGroupOutput, error) {
		if err := requireWriteScope(ctx); err != nil {
			return nil, RenameGroupOutput{}, err
		}
		group, err := panelSvc.RenameGroup(ctx, in.GroupID, in.Name)
		if err != nil {
			return nil, RenameGroupOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_rename_group", "group", group.ID, true)
		return nil, RenameGroupOutput{Group: *group}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_create_app",
		Title:       "Create HomeLab Panel app",
		Description: "Create a new app in a group. The app id is allocated by the server. Requires the read_write MCP scope.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  false,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in CreateAppInput) (*mcp.CallToolResult, CreateAppOutput, error) {
		if err := requireWriteScope(ctx); err != nil {
			return nil, CreateAppOutput{}, err
		}
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
		Description: "Replace the full configuration of an app by its id. Requires the read_write MCP scope.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(true),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in ReplaceAppInput) (*mcp.CallToolResult, ReplaceAppOutput, error) {
		if err := requireWriteScope(ctx); err != nil {
			return nil, ReplaceAppOutput{}, err
		}
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
		Description: "Patch selected fields of an app by its id. Requires the read_write MCP scope.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint:    false,
			DestructiveHint: ptr(false),
			IdempotentHint:  true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in PatchAppInput) (*mcp.CallToolResult, PatchAppOutput, error) {
		if err := requireWriteScope(ctx); err != nil {
			return nil, PatchAppOutput{}, err
		}
		item, err := panelSvc.PatchApp(ctx, in.ID, toPanelPatchInput(in))
		if err != nil {
			return nil, PatchAppOutput{}, err
		}
		auditToolCall(ctx, "homelab_panel_patch_app", "app", item.ID, true)
		return nil, PatchAppOutput{Item: *item}, nil
	})
}
