# Development Guide

[中文](development.md) | [English](development.en.md)

This document is for building from source, testing, and contributing. For normal deployment, start with the [README](../README.en.md).

## Requirements

- Go 1.26
- Node.js / npm
- Frontend dependencies are locked by `web/package-lock.json`

## Build From Source

```bash
npm --prefix web install
make build
```

Build output:

```text
./homelab-panel
```

Start a local service:

```bash
./homelab-panel serve --port 9090 --dir ./data
```

## Makefile Targets

| Command | Purpose |
| --- | --- |
| `make help` | Show available targets |
| `make web` | Build the React frontend |
| `make build` | Build the frontend and Go binary |
| `make all` | Full build |
| `make fmt` | Format frontend and backend code |
| `make check` | Run static checks |
| `make test` | Run frontend and backend tests with coverage |
| `make clean` | Remove build, runtime, and test outputs |
| `make serve` | Build and start the local service |

## Frontend Development

```bash
cd web
npm install
npm run build
npm run type-check
npm run lint
npm run test
```

Formatting and linting are handled by Biome:

```bash
npm run lint:fix
```

## Backend Development

```bash
gofmt -w main.go internal
go vet ./...
go test ./...
CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .
```

## Icon Rendering Conventions

App icons use Iconify exclusively. The data model is:

```json
{
    "text": "mdi:server-network",
    "color": "#FFFFFF",
    "background_color": "#2196F3"
}
```

| Field | Meaning |
| --- | --- |
| `text` | Iconify name (e.g. `mdi:server-network`), required |
| `color` | icon foreground color (white/black) |
| `background_color` | card/icon background color, one of the 21 presets |

A `null` icon means no icon; once an `icon` object exists, its `text`
must be a valid Iconify name. Legacy Iconify icon data requires no
explicit migration. The obsolete `item_type` and `src` fields are
ignored when loading and disappear on the next save, while `text`,
`color`, and `background_color` are preserved.

Legacy plain-text and image icons are no longer supported and should be
converted to Iconify icons before upgrading.

Iconify icons are stored in panel data as identifiers only, and the web
frontend loads and renders them on demand from the Iconify API via
`@iconify/react`. The backend only stores and returns the
identifier — it does not proxy, cache, prefetch, or serve Iconify SVGs.

Backend availability is therefore independent of Iconify availability:
when the browser has no internet access, not-yet-cached Iconify icons
may be missing, while the panel itself keeps working.

The legacy server-side icon cache directory `<data-dir>/iconify/` is
obsolete; if an upgraded deployment still has it, delete it manually —
the application simply ignores it.

## Manual Build Flow

Frontend:

```bash
cd web
npm install
npm run build
```

Backend:

```bash
cd ..
CGO_ENABLED=0 go build -o homelab-panel -ldflags "-s -w" .
```

## Cross-Compilation

Linux amd64:

```bash
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 \
  go build -o homelab-panel-linux-amd64 -ldflags "-s -w" .
```

Windows amd64:

```bash
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 \
  go build -o homelab-panel-windows-amd64.exe -ldflags "-s -w" .
```

## Pre-Commit Checks

Before committing code changes, run:

```bash
make fmt
make check
make test
git diff --check
```
