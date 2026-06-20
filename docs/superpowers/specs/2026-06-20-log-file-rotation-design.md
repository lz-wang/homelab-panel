# Log file output with rotation

## Background

The application logs through a single global logger in `internal/logging` (a zap
console encoder wrapped as a sugared logger). Today every line goes to `os.Stderr`.
There is no persistent on-disk log file and no rotation, so logs are lost on a
container/systemd restart (unless the supervisor captures stderr) and can grow
unbounded while running.

## Goal

Write application logs to `<dataDir>/logs/homelab-panel.log`, rotating automatically at
50 MiB per file, while keeping the existing stderr output.

## Decisions (confirmed with user)

- **Tee output**: write to both the file and `os.Stderr`. The file provides
  persistence + rotation; stderr stays available for `docker logs` / `journalctl` /
  a foreground terminal.
- **Rotation policy**: 50 MiB per file, keep 7 backups, gzip-compress old files.
  Implemented with `gopkg.in/natefinch/lumberjack.v2`; parameters are fixed as package
  constants (not user-configurable).

## Non-goals (YAGNI)

- No `Options` struct / runtime configuration of rotation parameters.
- No time-based (`MaxAge`) cleanup — count-based (7 backups) is sufficient.
- The `reset-password` CLI does **not** write to the file; it stays stderr-only
  (one-shot interactive maintenance command).

## Design

### `internal/logging/logger.go`

- Change `Init()` (no args) → `Init(dataDir string)`:
  - `dataDir == ""` → stderr only (current behavior; keeps tests and the non-serve
    path safe).
  - otherwise → `zapcore.NewMultiWriteSyncer(stderrSyncer, fileSyncer)` so both sinks
    receive every line.
- `fileSyncer = zapcore.AddSync(&lumberjack.Logger{...})` with:
  - `Filename`: `filepath.Join(dataDir, "logs", "homelab-panel.log")`
  - `MaxSize: 50`, `MaxBackups: 7`, `Compress: true`, `LocalTime: true`
- Create the `logs` directory with `os.MkdirAll(..., 0o755)` before constructing the
  lumberjack logger. On failure (read-only FS, permission denied) write one notice
  line to stderr and fall back to **stderr only** — never lose logs.
- Package-level `var sugar` still initializes to stderr (non-nil before `Init`, so
  early-startup lines and tests are safe).
- `newSugared(sync)` is unchanged — tests that inject a buffer keep working.
- Update the package doc comment to describe the new file+stderr behavior.

### `main.go`

- Remove the `logging.Init()` call at the top of `main()` (the package-level default
  already wires stderr; CLI flags are not parsed yet at that point anyway).
- In `runServe`, after building `cfg` and before `app.Run`, call
  `logging.Init(cfg.dataDir())` — using the same resolution `app.New` uses.
- `runResetPassword` stays unchanged (relies on the stderr default).
- Exit cleanup: **already present** — `app.Run` defers `logging.Sync()`
  (`internal/app/app.go:61-63`). No new code needed.

### Dependency

- `go get gopkg.in/natefinch/lumberjack.v2`; then `go mod tidy`.

### `.gitignore`

- `logs/`, `*.log`, and `/data/` are already ignored, so rotation artifacts under
  `data/logs/` will not be committed. No change needed.

## Data flow

```
caller logging.Infof(...)
  → global *zap.SugaredLogger
  → zap console encoder (format unchanged)
  → MultiWriteSyncer
      ├─ os.Stderr            (live view, unchanged)
      └─ lumberjack.Logger
            → data/logs/homelab-panel.log
            → exceeds 50MiB ⇒ rename + gzip, keep last 7
```

## Error handling

- `logs` dir creation failure → stderr fallback (one notice line first).
- lumberjack write failure → handled internally by zap/lumberjack; will not panic the
  server. The stderr copy still captures the line.

## Testing

- New `internal/logging/logger_test.go`:
  - `newSugared(buffer)` — assert the existing single-line format
    (`YYYY-MM-DD HH:MM:SS LEVEL  message`) is unchanged.
  - `Init(tempDir)` — write one Info line, then assert
    `<tempDir>/logs/homelab-panel.log` exists and contains the expected formatted line.
  - `Init("")` — assert no file is created (stderr-only path).
- Existing call sites (`logging.Infof` etc.) need no changes — the package's
  printf-style public API is unchanged.

## Validation

- `gofmt -w internal/logging main.go`
- `go vet ./...`
- `go test ./...`
- `CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .`
- Manual: `./homelab-panel serve`, confirm a line appears both in the terminal and in
  `data/logs/homelab-panel.log`.

## Note on this document

`docs/superpowers/` is listed in `.gitignore`, so this spec is local-only and is not
committed. Move it (or adjust `.gitignore`) if it should be tracked.
