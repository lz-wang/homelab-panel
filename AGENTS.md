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

## Documentation conventions

- When editing README content, update both the Chinese and English versions together (`README.md` and `README.en.md`, plus matching linked docs when applicable).

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
make test-backend
make test-frontend
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

After every code change, run the whole-project frontend + backend fix/check/test
gate before handing work back:

```bash
make fmt
make check
make test
git diff --check
```

This is required even for frontend-only or backend-only code changes. `make fmt`
is the fix step: it runs backend `gofmt` and frontend Biome write checks.
`make check` runs the frontend build/type/Biome checks and backend vet checks.
`make test` runs both backend and frontend tests with coverage.

If a whole-project command fails, diagnose with the narrower commands below, fix
the cause, then rerun the whole-project gate above:

- Frontend:
  - `cd web && npm run lint:fix`
  - `cd web && npm run lint`
  - `cd web && npm run type-check`
  - `cd web && npm run build`
  - `cd web && npm run test`
- Backend:
  - `gofmt -w main.go internal`
  - `go vet ./...`
  - `go test ./...`
  - `go mod verify`
  - `CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .`

For docs-only changes, `git diff --check` is usually enough unless the docs also
change commands, CI, or code examples that should be verified.

Do not proactively run full browser/E2E validation unless the user asks for it or the change is specifically about rendered behavior. If you do run a local server and sandboxing blocks port binding, request escalation rather than changing the implementation.

## Release and Homebrew publishing

- Release automation is defined in `.github/workflows/release.yml`. It starts when an existing `v*` tag is pushed, or when `workflow_dispatch` receives an existing tag in its `version` input. The workflow verifies the tag before building, so never use a branch name or an unpushed tag as the input.
- Before creating a release, inspect the current branch and worktree, run the complete gate (`make fmt`, `make check`, `make test`, `git diff --check`), then create an annotated tag such as `v0.1.1` and push the branch plus tag. Do not move or recreate a public release tag; publish a new patch tag to correct a released build.
- A release builds six binaries and publishes both raw binaries and archives with SHA-256 files. The four Darwin/Linux archives use Homebrew-friendly names such as `homelab-panel_0.1.1_darwin_arm64.tar.gz` and contain a top-level `homelab-panel` executable.
- The workflow requires the repository secret `HOMEBREW_TAP_TOKEN` before releasing. It must be able to check out and push `lz-wang/homebrew-tap`; do not expose or store its value in repository files, logs, or documentation.
- After the GitHub Release is public, the `homebrew` job reads the four public archive checksums, generates `Formula/homelab-panel.rb`, runs `brew audit --strict`, `brew install`, and `brew test`, then pushes the Formula only if all checks succeed. It skips a release that is no longer the latest to prevent Formula rollback.
- For a release investigation, verify the GitHub Release assets and the resulting commit in `lz-wang/homebrew-tap`. A green main Release job alone is not proof that the Formula was published.

## Frontend conventions

- npm with `web/package-lock.json` is the dependency source of truth.
- Formatting and linting are Biome-driven through `web/biome.json`.
- Frontend TypeScript/TSX uses 4-space indentation.
- Keep `npm run lint` clean; it runs Biome checks.
- Prefer existing API adapter seams in `web/src/api/*`, especially `web/src/api/adapters.ts`, when backend contracts change.
- Keep React/MUI UI changes localized and avoid unrelated styling churn.
- MUI `Tooltip` always renders below the anchor — use `placement="bottom"` consistently.
- Do not stage or commit `web/.env` by default.

## Backend and embedding conventions

- Keep the embedded frontend asset path intact: build output is expected under `web/dist`.

## MCP server

The panel exposes an MCP (Model Context Protocol) endpoint at `/api/v1/mcp` (Streamable HTTP) so agents like Codex / Claude Code can read and mutate the panel.

- Packages:
  - `internal/mcpserver`: server assembly (`server.go`), bearer-token auth + scope injection (`auth.go`, `context.go`), token gen/hash (`token.go`), tool DTOs (`types.go`), read/write tools (`tools_read.go`, `tools_write.go`), and DTO→panel conversion (`convert.go`).
  - `internal/panel`: `Service` is the single business seam the tools depend on (`service.go`, `types.go`, `validate.go`). MCP DTOs never touch `data.*` models directly.
- Auth is **independent of the admin JWT**: a bearer token issued from the settings page (`POST /api/v1/mcp/token`). Multiple tokens may be issued; delete one by prefix (`DELETE /api/v1/mcp/token/:prefix`). Only the sha256 hash + a display prefix are stored; plaintext is returned once. Disabled MCP or an unknown token → 401/403.
- There is no read/write scope — all tools are available once authenticated.
- A 1 MiB body cap and an Origin check (empty/same-origin allowed, else 403) guard the route.
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
