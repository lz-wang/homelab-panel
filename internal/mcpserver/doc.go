// Package mcpserver exposes HomeLab Panel data and writes over the Model
// Context Protocol (MCP) via a Streamable HTTP endpoint.
//
// The endpoint is mounted at /api/v1/mcp and authenticates requests with a
// bearer token issued from the admin settings page. Tools are split into read
// (always available once authenticated) and write (require read_write scope)
// sets, registered against an injected panel.Service.
package mcpserver
