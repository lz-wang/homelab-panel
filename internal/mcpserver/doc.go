// Package mcpserver exposes HomeLab Panel data and writes over the Model
// Context Protocol (MCP) via a Streamable HTTP endpoint.
//
// The endpoint is mounted at /api/v1/mcp and authenticates requests with a
// bearer token issued from the admin settings page. All tools are available
// once authenticated (no separate read/write scope), registered against an
// injected panel.Service.
package mcpserver
