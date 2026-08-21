# homelab-panel

[中文](README.md) | [English](README.en.md)

[![codecov](https://codecov.io/gh/lz-wang/homelab-panel/graph/badge.svg?token=2jDdgRukgN)](https://codecov.io/gh/lz-wang/homelab-panel)

`homelab-panel` is a lightweight dashboard for personal Homelab navigation. It embeds the frontend into a Go binary, so one file and one process are enough to run the full app.

## Project Highlights

- **Simple deployment**: download the binary for your platform, then choose a port and data directory.
- **Local-first storage**: panel settings, groups, apps, and file metadata live in `homelab-panel.json`.
- **Customizable dashboard**: groups, app cards, search, clock, background, overlay, radius, title, and favicon.
- **File uploads**: uploaded files are stored under `uploads/` and can be used as icons, backgrounds, or static files.
- **Single-admin mode**: the first run generates an admin password; forgotten passwords can be reset from the CLI.
- **Agent management**: the built-in MCP HTTP endpoint lets Codex, Claude Code, and other LLM agents manage the panel with a token.
- **Service friendly**: designed to run under systemd, with logs written under the data directory and available through `journalctl`.

## Download

Download the matching binary from [Releases](https://github.com/lz-wang/homelab-panel/releases):

| OS | Arch | Example file |
| --- | --- | --- |
| Linux | amd64 / arm64 | `homelab-panel-v0.1-linux-amd64` |
| macOS | amd64 / arm64 | `homelab-panel-v0.1-darwin-arm64` |
| Windows | amd64 / arm64 | `homelab-panel-v0.1-windows-amd64.exe` |

You can also download the matching `.sha256` file to verify integrity.

On macOS or Linux, install and upgrade with Homebrew:

```bash
brew install lz-wang/tap/homelab-panel
brew upgrade homelab-panel
```

## Quick Start

Linux/macOS:

```bash
chmod +x homelab-panel-v0.1-linux-amd64
./homelab-panel-v0.1-linux-amd64 serve --port 9090 --dir ./data
```

Windows PowerShell:

```powershell
.\homelab-panel-v0.1-windows-amd64.exe serve --port 9090 --dir .\data
```

On first run, if `homelab-panel.json` does not exist in the data directory, the app initializes the data file and prints the admin password once to stdout. Save it immediately, then open:

```text
http://<server IP>:9090
```

After logging in, you can customize the panel, change the password, manage files, and manage MCP tokens.

### Startup Options

| Option | Default | Description |
| --- | --- | --- |
| `--port`, `-p` | `9090` | HTTP listen port. |
| `--dir`, `-d` | `./data` | Data directory for the main data file, uploads, and logs. |

Example data directory:

```text
data/
  homelab-panel.json
  uploads/
  logs/
```

## Deploy With systemd

Assume the binary and data directory live under `/root/app/`:

```bash
mkdir -p /root/app
cp homelab-panel-v0.1-linux-amd64 /root/app/homelab-panel
chmod +x /root/app/homelab-panel
```

Create `/etc/systemd/system/homelab-panel.service`:

```ini
[Unit]
Description=Homelab Panel
After=network.target

[Service]
ExecStart=/root/app/homelab-panel serve --port 9090 --dir /root/app/data
Restart=always
RestartSec=5
WorkingDirectory=/root/app

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
systemctl daemon-reload
systemctl enable --now homelab-panel
```

Common commands:

```bash
systemctl status homelab-panel
systemctl restart homelab-panel
journalctl -u homelab-panel -f
```

For public access, let the app listen on `9090` and put it behind an HTTPS reverse proxy such as Nginx or Caddy.

## Reset the Admin Password

If you forget the password, run this on the server:

```bash
./homelab-panel reset-password --dir ./data
```

For non-interactive environments, pass the new password directly:

```bash
./homelab-panel reset-password --dir ./data --password 'new-password'
```

> [!IMPORTANT]
> `--dir` must point to the active data directory, otherwise you will update the wrong data file.

## Backup and Restore

`homelab-panel` state is mainly defined by the data directory. Back up at least:

- `homelab-panel.json`
- `uploads/`

### Backup

```bash
systemctl stop homelab-panel
tar -czf homelab-panel-backup-$(date +%F).tar.gz -C /root/app data
systemctl start homelab-panel
```

### Restore

```bash
systemctl stop homelab-panel
mkdir -p /root/app
tar -xzf homelab-panel-backup-2026-07-10.tar.gz -C /root/app
systemctl start homelab-panel
```

### Move to Another Machine

Copy the binary and the full data directory:

```bash
scp homelab-panel root@new-host:/root/app/
scp -r data root@new-host:/root/app/
```

Start it with the same data directory:

```bash
/root/app/homelab-panel serve --port 9090 --dir /root/app/data
```

## Manage With an LLM Agent

The service exposes an MCP Streamable HTTP endpoint:

```text
POST /api/v1/mcp
```

Enable it in the Web UI:

1. Log in as admin.
2. Open MCP settings.
3. Enable MCP and generate a token.
4. Copy the plaintext token immediately. It is shown only once.
5. Configure the URL and `Authorization` header in your agent client.

### Claude Code

```bash
export HOMELAB_PANEL_MCP_TOKEN="hlpmcp_xxxx..."

claude mcp add --transport http homelab-panel \
  http://<server IP>:9090/api/v1/mcp \
  --header "Authorization: Bearer $HOMELAB_PANEL_MCP_TOKEN"
```

### Codex

Add an HTTP MCP server to `~/.codex/config.toml`. The settings page provides a copyable snippet. The core fields are:

```toml
[mcp_servers.homelab-panel]
url = "http://<server IP>:9090/api/v1/mcp"
bearer_token_env_var = "HOMELAB_PANEL_MCP_TOKEN"
```

MCP tokens are independent from the admin login JWT. Deleting a token prefix invalidates that token immediately.

## Security Notes

> [!WARNING]
> Do not expose the data directory as a static directory.

- Backups contain the admin password hash, MCP token hashes, panel settings, and uploaded files. Store them carefully.
- MCP plaintext tokens are shown only once. If a token leaks, delete its prefix and generate a new one.
- When exposing the service publicly, use an HTTPS reverse proxy and restrict access to admin routes where possible.

## Development

For local build, test, cross-compilation, and development commands, see the [Development Guide](docs/development.en.md).

## Acknowledgements

This project is a rewrite based on [hslr-s/sun-panel](https://github.com/hslr-s/sun-panel). Thanks to the original author.
