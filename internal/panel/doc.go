// Package panel encapsulates the business logic for reading and mutating the
// HomeLab Panel: groups and the apps (items) they contain.
//
// It is the single seam the MCP server depends on, so MCP DTOs never leak into
// the data store models and vice versa. Validation lives in validate.go.
package panel
