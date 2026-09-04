package mcpserver

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"homelab-panel/internal/panel"
)

// registerReadTools 注册 6 个只读工具。已通过 MCP 鉴权即可调用，无需写权限。
func registerReadTools(s *mcp.Server, panelSvc *panel.Service) {
	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_get_panel",
		Title:       "Get HomeLab Panel snapshot",
		Description: "Get the complete HomeLab Panel settings, groups and app details in one snapshot.",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: true},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, _ EmptyInput) (*mcp.CallToolResult, GetPanelOutput, error) {
		value, err := panelSvc.GetPanel(ctx)
		if err != nil {
			return nil, GetPanelOutput{}, err
		}
		return nil, GetPanelOutput{Panel: *value}, nil
	})
	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_list_groups",
		Title:       "List HomeLab Panel groups",
		Description: "List all HomeLab Panel groups without their apps.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint: true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, _ EmptyInput) (*mcp.CallToolResult, ListGroupsOutput, error) {
		groups, err := panelSvc.ListGroups(ctx)
		if err != nil {
			return nil, ListGroupsOutput{}, err
		}
		return nil, ListGroupsOutput{Groups: groups}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_list_apps_by_group",
		Title:       "List apps by group",
		Description: "List apps in a group, returning id, group_id, title, URL, description and sort.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint: true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in ListAppsByGroupInput) (*mcp.CallToolResult, ListAppsByGroupOutput, error) {
		items, err := panelSvc.ListAppsByGroup(ctx, in.GroupID)
		if err != nil {
			return nil, ListAppsByGroupOutput{}, err
		}
		return nil, ListAppsByGroupOutput{Items: items}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_search_apps",
		Title:       "Search HomeLab Panel apps",
		Description: "Search apps by title, description, URL, backup URL or Iconify icon name using a regular expression.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint: true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in SearchAppsInput) (*mcp.CallToolResult, SearchAppsOutput, error) {
		items, err := panelSvc.SearchApps(ctx, in.Pattern, in.CaseSensitive, in.Limit)
		if err != nil {
			return nil, SearchAppsOutput{}, err
		}
		return nil, SearchAppsOutput{Items: items}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name:        "homelab_panel_get_app",
		Title:       "Get HomeLab Panel app",
		Description: "Get the full configuration of an app by its id.",
		Annotations: &mcp.ToolAnnotations{
			ReadOnlyHint: true,
		},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in GetAppInput) (*mcp.CallToolResult, GetAppOutput, error) {
		item, err := panelSvc.GetApp(ctx, in.ID)
		if err != nil {
			return nil, GetAppOutput{}, err
		}
		return nil, GetAppOutput{Item: *item}, nil
	})

	mcp.AddTool(s, &mcp.Tool{
		Name: "homelab_panel_list_files", Title: "List HomeLab Panel files",
		Description: "List uploaded file metadata and reusable URLs. This tool does not return file contents.",
		Annotations: &mcp.ToolAnnotations{ReadOnlyHint: true},
	}, func(ctx context.Context, _ *mcp.CallToolRequest, _ EmptyInput) (*mcp.CallToolResult, ListFilesOutput, error) {
		files, err := panelSvc.ListFiles(ctx)
		if err != nil {
			return nil, ListFilesOutput{}, err
		}
		return nil, ListFilesOutput{Files: files}, nil
	})
}

// ptr 返回 v 的指针，用于 ToolAnnotations 中的 *bool 字段。
func ptr[T any](v T) *T {
	return &v
}
