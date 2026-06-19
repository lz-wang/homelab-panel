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

## Logging conventions

Application logs are plain-text single-line **English** (not JSON), built by `internal/logging.NewLogger()` (a zap console encoder). `main.go` and `internal/app` share the same configuration.

Format:

```
2026-06-19 21:24:26 INFO   starting server on :3002
2026-06-19 21:24:26 INFO   127.0.0.1 GET /api/v1/panel 200 3ms
```

- Timestamp: `2006-01-02 15:04:05`
- Level: uppercase, fixed 6-char left-aligned width (`INFO  `/`WARN  `/`ERROR `/`DEBUG `/`FATAL `) so the message column lines up
- Writes to **stderr**; user-facing program output (first-run password banner, CLI reset notice) goes to stdout — the two are kept separate
- Caller and stacktrace are disabled so every entry stays a single line

When adding log calls:

- **Use plain-text messages** — do not pass structured fields like `zap.String`/`zap.Int`. With no fields the console encoder emits only `time level message\n`; bake context into the message itself (e.g. `"admin login from " + ip` or `fmt.Sprintf`).
- **API request logs** are recorded centrally by the `requestLogger` middleware in `internal/app/middleware.go`, registered only on the `/api/v1` group, as `<IP> <METHOD> <PATH> <STATUS> <LATENCY>` with level by status (2xx→INFO / 4xx→WARN / 5xx→ERROR). Do not duplicate access logging inside handlers.
- **Operation logs**: state changes (login/logout/password change/panel update/upload/file delete/first-run password generation/CLI password reset, etc.) must log one INFO line; client-side failures (wrong password, unauthorized access) log WARN; server-side 500 failures log ERROR with `err` folded into the message. Request-scoped operations should include the source IP (`c.ClientIP()`).
- Prefer the injected logger (`s.logger` / `h.Logger` / the store's `logger` field); do not construct `zap.NewProduction()`/`zap.NewDevelopment()` inside packages (tests excepted).

## Change discipline

- Preserve user changes in the working tree. Check `git status --short` before broad edits.
- Avoid unrelated formatting outside the requested scope.
- For staged plan work, keep changes in small, verifiable increments.
- When modifying user-facing command docs, keep `Makefile` help text and `AGENTS.md` synchronized.
- Do not commit, stage, push, or open PRs unless explicitly asked.
