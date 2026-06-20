# AGENTS.md instructions

<!-- CODEGRAPH_START -->
## CodeGraph

This repository has a `.codegraph/` directory. When you need to understand or locate source code, reach for CodeGraph before grep/find or manually reading source files:

- Prefer MCP tools when available:
  - `codegraph_explore` for most code questions and multi-symbol context.
  - `codegraph_node` for one symbol or an indexed source file with line numbers.
- Shell fallback:
  - `codegraph explore "<question or symbols>"`
  - `codegraph node <symbol-or-file>`

If CodeGraph reports that a file is not indexed, read that file directly. This is common for root config, docs, and HTML files.
<!-- CODEGRAPH_END -->

## Project overview

`homelab-panel` is a Go single-binary application with an embedded Vite frontend.

- Backend entrypoint: `main.go`
- Backend code: `internal/`
- Swagger/docs package: `docs/`
- Frontend app: `web/`
- Frontend build output: `web/dist/`
- Runtime/local data: `data/`

The frontend is React + MUI + Vite. Do not describe it as Vue in new docs or comments.

## Common commands

Use root `make` targets when working across backend and frontend:

```bash
make help
make web
make build
make all
make fmt
make check
make test
make clean
make serve
```

Frontend-only work should usually run commands from `web/`:

```bash
npm run format
npm run format:check
npm run lint
npm run lint:fix
npm run type-check
npm run build
npm run test
```

Backend-only checks:

```bash
gofmt -w main.go internal
go vet ./...
go test ./...
go mod verify
CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .
```

## Validation expectations

Choose validation proportional to the change:

- Frontend UI/config changes:
  - `cd web && npm run lint`
  - `cd web && npm run build`
  - `git diff --check`
- Frontend logic changes:
  - add `cd web && npm run test` when tests cover the touched area
- Backend changes:
  - `go vet ./...`
  - `go test ./...`
  - build the binary when behavior, embedding, or startup code changes
- Cross-cutting changes:
  - prefer `make check` or `make test`

Do not proactively run full browser/E2E validation unless the user asks for it or the change is specifically about rendered behavior. If you do run a local server and sandboxing blocks port binding, request escalation rather than changing the implementation.

## Frontend conventions

- npm with `web/package-lock.json` is the dependency source of truth.
- Formatting is Prettier-driven through `web/.prettierrc.json`.
- Frontend TypeScript/TSX uses 4-space indentation.
- ESLint is configured with flat config in `web/eslint.config.mjs`.
- Keep `npm run lint` clean; it includes Prettier format checking.
- Prefer existing API adapter seams in `web/src/api/*`, especially `web/src/api/adapters.ts`, when backend contracts change.
- Keep React/MUI UI changes localized and avoid unrelated styling churn.
- Do not stage or commit `web/.env` by default.

## Backend and embedding conventions

- Keep the embedded frontend asset path intact: build output is expected under `web/dist`.

## MCP server

The panel exposes an MCP (Model Context Protocol) endpoint at `/api/v1/mcp` (Streamable HTTP) so agents like Codex / Claude Code can read and mutate the panel.

- Packages:
  - `internal/mcpserver`: server assembly (`server.go`), bearer-token auth + scope injection (`auth.go`, `context.go`), token gen/hash (`token.go`), rate limiting (`ratelimit.go`), tool DTOs (`types.go`), read/write tools (`tools_read.go`, `tools_write.go`), and DTO→panel conversion (`convert.go`).
  - `internal/panel`: `Service` is the single business seam the tools depend on (`service.go`, `types.go`, `validate.go`). MCP DTOs never touch `data.*` models directly.
- Auth is **independent of the admin JWT**: a bearer token issued from the settings page (`POST /api/v1/mcp/token`). Multiple tokens may be issued; delete one by prefix (`DELETE /api/v1/mcp/token/:prefix`). Only the sha256 hash + a display prefix are stored; plaintext is returned once. Disabled MCP or an unknown token → 401/403.
- There is no read/write scope — all tools are available once authenticated. The SDK propagates `req.Context()` into tool handlers, so per-tool rate limiting works.
- Rate limits (in-memory, per token+IP): overall 60/min, write tools 10/min, search 20/min. A 1 MiB body cap and an Origin check (empty/same-origin allowed, else 403) guard the route.
- Audit + access logs go through the **single global logger** (`internal/logging`), not a separate JSONL sink. Write tools log one `mcp tool call:` INFO line; the `requestLogger()` middleware records the request line.

## Logging conventions

Application logs are plain-text single-line **English** (not JSON), produced by a single **global logger** in `internal/logging` (a zap console encoder wrapped as a sugared logger).

- `main()` calls `logging.Init()` once at startup, before any goroutine starts logging. The package also installs a stderr default at load time, so it is never nil even in tests that do not call `Init()`.
- **Call the package-level functions directly** from anywhere — no logger is threaded through structs:

  ```go
  logging.Infof("starting server on %s", addr)
  logging.Warnf("admin login failed from %s", ip)
  logging.Errorf("save panel failed: %v", err)
  logging.Sync() // before exit
  ```

  Available: `Debugf`/`Infof`/`Warnf`/`Errorf` (printf-style) and `Debug`/`Info`/`Warn`/`Error` (join-style). Use the printf variants and bake context into the message — do **not** use structured fields (`zap.String`, sugared `Infow`/`With`); with no fields the encoder emits only `time level message\n`.

Format:

```
2026-06-19 21:24:26 INFO   starting server on :3002
2026-06-19 21:24:26 INFO   127.0.0.1 GET /api/v1/panel 200 3ms
```

- Timestamp: `2006-01-02 15:04:05`
- Level: uppercase, fixed 6-char left-aligned width (`INFO  `/`WARN  `/`ERROR `/`DEBUG `/`FATAL `) so the message column lines up
- Writes to **stderr**; user-facing program output (first-run password banner, CLI reset notice) goes to stdout — the two are kept separate
- Caller and stacktrace are disabled so every entry stays a single line

What to log:

- **API request logs** are recorded centrally by the `requestLogger()` middleware in `internal/app/middleware.go`, registered only on the `/api/v1` group, as `<IP> <METHOD> <PATH> <STATUS> <LATENCY>` with level by status (2xx→INFO / 4xx→WARN / 5xx→ERROR). Do not duplicate access logging inside handlers.
- **Operation logs**: state changes (login/logout/password change/panel update/upload/file delete/first-run password generation/CLI password reset, etc.) must log one INFO line; client-side failures (wrong password, unauthorized access) log WARN; server-side 500 failures log ERROR with `err` folded into the message. Request-scoped operations should include the source IP (`c.ClientIP()`).

Do not add a `logger`/`Logger` field to structs or pass `*zap.Logger` through function parameters — use the global `logging.*` calls. Do not construct `zap.NewProduction()`/`zap.NewDevelopment()` inside packages.

## Change discipline

- Preserve user changes in the working tree. Check `git status --short` before broad edits.
- Avoid unrelated formatting outside the requested scope.
- For staged plan work, keep changes in small, verifiable increments.
- When modifying user-facing command docs, keep `Makefile` help text and `AGENTS.md` synchronized.
- Do not commit, stage, push, or open PRs unless explicitly asked.
