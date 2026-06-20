# homelab-panel

A single-binary Go service with an embedded React (MUI + Vite) frontend that
renders a personal homelab dashboard: groups of apps, custom backgrounds, a
search box, and a file manager. Data is stored in a local JSON file.

## Build & run

```bash
make help        # list targets
make build       # build the frontend, then the Go binary
./homelab-panel serve --port 3002 --dir ./data
```

On first run an admin password is generated and printed once to stdout. Sign
in, then open **Settings** to configure the panel.

Backend-only / frontend-only checks:

```bash
go vet ./... && go test ./...
cd web && npm run lint && npm run build
```

See `AGENTS.md` for the full architecture and conventions.

## MCP integration

The panel exposes a [Model Context Protocol](https://modelcontextprotocol.io)
Streamable HTTP endpoint so agents (Codex, Claude Code) can read and edit the
dashboard:

```
POST /api/v1/mcp
```

### Tools

| Tool | Description |
| --- | --- |
| `homelab_panel_list_groups` | List groups without their apps |
| `homelab_panel_list_apps_by_group` | List apps in a group |
| `homelab_panel_search_apps` | Regex search by title / description / icon |
| `homelab_panel_get_app` | Full app detail by id |
| `homelab_panel_rename_group` | Rename a group |
| `homelab_panel_create_app` | Create an app (server allocates the id) |
| `homelab_panel_replace_app` | Replace an app's full config |
| `homelab_panel_patch_app` | Patch selected app fields |

### Setup

1. Sign in, open **Settings → MCP 设置**.
2. Click **生成 Token**. The plaintext token is shown **once** — copy it
   immediately. Only a sha256 hash and a display prefix are stored. You can
   issue multiple tokens and delete any one by its prefix.
3. Export the token and copy the matching client config from the same page:

   ```bash
   export HOMELAB_PANEL_MCP_TOKEN="hlpmcp_xxxx...."
   claude mcp add --transport http homelab-panel \
     https://<your-host>/api/v1/mcp \
     --header "Authorization: Bearer $HOMELAB_PANEL_MCP_TOKEN"
   ```

The settings page also provides ready-to-copy blocks for Codex
(`~/.codex/config.toml`) and a project `.mcp.json`.

### Security notes

- Authentication uses an MCP bearer token, **not** the admin session JWT.
  All tools are available once authenticated.
- Per token+IP rate limits apply (overall 60/min, writes 10/min, search 20/min),
  plus a 1 MiB request body cap and an Origin check on the endpoint.
- Tools never return admin credentials, token hashes, or internal store state.
