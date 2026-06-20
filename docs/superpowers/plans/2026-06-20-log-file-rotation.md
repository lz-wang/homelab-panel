# Log File Output With Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write application logs to `<dataDir>/logs/homelab-panel.log` with automatic 50 MiB rotation (7 backups, gzip), while keeping stderr output.

**Architecture:** Extend the single global zap logger in `internal/logging` to tee into a `lumberjack.Logger`-backed file syncer alongside the existing stderr syncer. `Init` gains a `dataDir` argument; the file path is derived from it. `main` calls `Init` after CLI flag parsing (inside `runServe`), since flags are not available at process start.

**Tech Stack:** Go, `go.uber.org/zap`, `gopkg.in/natefinch/lumberjack.v2`, `urfave/cli/v2`.

**Project commit discipline:** This repo's `CLAUDE.md` says "Do not commit, stage, push, or open PRs unless explicitly asked." Treat each **Commit** step below as a clean checkpoint to pause for the user's go-ahead, not an auto-commit. Run the verification commands; do not run `git commit` unless the user asks.

**Reference spec:** `docs/superpowers/specs/2026-06-20-log-file-rotation-design.md`

---

### Task 1: Add the lumberjack dependency

**Files:**
- Modify: `go.mod`, `go.sum`

- [ ] **Step 1: Fetch the module**

Run:
```bash
go get gopkg.in/natefinch/lumberjack.v2
```
Expected: `go: added gopkg.in/natefinch/lumberjack.v2 vX.Y.Z` and `go.mod` gains the require line.

- [ ] **Step 2: Tidy modules**

Run:
```bash
go mod tidy
```
Expected: exits 0; `go.sum` updated; no "downloaded" churn beyond lumberjack.

- [ ] **Step 3: Verify the module resolves**

Run:
```bash
go list gopkg.in/natefinch/lumberjack.v2
```
Expected: prints `gopkg.in/natefinch/lumberjack.v2` with no error.

- [ ] **Step 4: Checkpoint (commit pending user approval)**

```bash
git status --short
```
Expected: `go.mod` and `go.sum` modified. Pause for user before committing.

---

### Task 2: TDD the logging package — `Init(dataDir)` writes a rotated file + stderr

**Files:**
- Create: `internal/logging/logger_test.go`
- Modify: `internal/logging/logger.go` (whole file rewrite of the `Init` area + imports + package doc + new constants)

- [ ] **Step 1: Write the failing tests**

Create `internal/logging/logger_test.go` with this exact content (Go uses **tab** indentation):

```go
package logging

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.uber.org/zap/zapcore"
)

// TestNewSugaredFormat 断言日志单行格式不变：时间 + 级别（6 字符宽）+ 消息。
func TestNewSugaredFormat(t *testing.T) {
	var buf bytes.Buffer
	lg := newSugared(zapcore.AddSync(&buf))
	lg.Infof("hello %s", "world")

	line := buf.String()
	if !strings.HasSuffix(line, "INFO   hello world\n") {
		t.Fatalf("unexpected log line: %q", line)
	}
	// 前缀应为 "YYYY-MM-DD HH:MM:SS "（第 5、8、14、17 位是分隔符）。
	if len(line) < 20 || line[4] != '-' || line[7] != '-' || line[10] != ' ' || line[13] != ':' || line[16] != ':' {
		t.Fatalf("unexpected timestamp prefix: %q", line)
	}
}

// TestInitWritesLogFile 断言 Init(dataDir) 把日志落到 <dataDir>/logs/homelab-panel.log。
func TestInitWritesLogFile(t *testing.T) {
	dir := t.TempDir()
	Init(dir)
	Infof("persisted line")
	_ = Sync()

	logPath := filepath.Join(dir, "logs", logFilename)
	data, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("read log file: %v", err)
	}
	if !strings.Contains(string(data), "persisted line") {
		t.Fatalf("log file missing line, got: %q", data)
	}

	// 恢复全局 logger 为 stderr，避免污染后续测试。
	Init("")
}

// TestInitEmptyDataDirNoFile 断言 Init("") 不创建日志文件（仅 stderr）。
func TestInitEmptyDataDirNoFile(t *testing.T) {
	dir := t.TempDir()
	Init("")
	Infof("stderr only")
	_ = Sync()

	logPath := filepath.Join(dir, "logs", logFilename)
	if _, err := os.Stat(logPath); !os.IsNotExist(err) {
		t.Fatalf("expected no log file under %s, got err=%v", logPath, err)
	}
	Init("")
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:
```bash
go test ./internal/logging/...
```
Expected: **compile error** — `Init` takes no arguments today (`too many arguments in call to Init`). This confirms the tests exercise the new signature.

- [ ] **Step 3: Rewrite `internal/logging/logger.go`**

Replace the **entire file** with (Go uses **tab** indentation):

```go
// Package logging 提供项目全局 logger。
//
// 在启动时调用 Init(dataDir) 完成初始化；之后各处直接用包级函数：
//
//	logging.Infof("starting server on %s", addr)
//	logging.Warnf("admin login failed from %s", ip)
//	logging.Errorf("save panel failed: %v", err)
//
// 输出为易读的英文纯文本单行（非 JSON），格式：
//
//	2026-06-19 21:24:26 INFO   starting server on :3002
//
//	- 时间：2006-01-02 15:04:05
//	- 级别：大写、固定 6 字符宽左对齐，保证消息列对齐
//	- 同时写到 <dataDir>/logs/homelab-panel.log（按 maxLogSizeMB 轮转，
//	  保留 maxLogBackups 份并 gzip 压缩）与 stderr；dataDir 为空或目录
//	  不可写时降级为仅 stderr，保证日志不丢
//	- 禁用 caller/stacktrace，确保始终单行
//
// 调用方应使用 Infof/Debugf 等 printf 风格把上下文拼进 message，
// 不要使用结构化字段（Infow/With），控制台 encoder 在无字段时只输出
// "time level message\n"。
package logging

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

// 日志文件轮转参数（固定常量，不对外配置）。
const (
	logFilename   = "homelab-panel.log"
	maxLogSizeMB  = 50
	maxLogBackups = 7
	compressLogs  = true
)

// sugar 是全局 sugared logger。包级初始化为写向 stderr 的默认实例，
// 因此即便未显式调用 Init（如测试）也始终非 nil；Init() 在启动时重新配置。
var sugar = newSugared(zapcore.AddSync(os.Stderr))

// Init 在启动时初始化全局 logger：同时写到 <dataDir>/logs/homelab-panel.log
// （按 maxLogSizeMB 轮转，保留 maxLogBackups 份并 gzip 压缩）与 stderr。
// dataDir 为空时仅写 stderr；创建日志目录失败时降级为仅 stderr。
// 应在程序入口（main）解析到数据目录后最先调用一次，早于任何 goroutine 开始记日志。
func Init(dataDir string) {
	stderrSyncer := zapcore.AddSync(os.Stderr)
	if dataDir == "" {
		sugar = newSugared(stderrSyncer)
		return
	}

	logPath := filepath.Join(dataDir, "logs", logFilename)
	if err := os.MkdirAll(filepath.Dir(logPath), 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "create log dir %s failed, falling back to stderr only: %v\n", filepath.Dir(logPath), err)
		sugar = newSugared(stderrSyncer)
		return
	}

	fileSyncer := zapcore.AddSync(&lumberjack.Logger{
		Filename:   logPath,
		MaxSize:    maxLogSizeMB,
		MaxBackups: maxLogBackups,
		Compress:   compressLogs,
		LocalTime:  true,
	})
	sugar = newSugared(zapcore.NewMultiWriteSyncer(stderrSyncer, fileSyncer))
}

// ---- 包级日志函数：各处直接调用即可 ----

func Debugf(format string, args ...any) { sugar.Debugf(format, args...) }
func Infof(format string, args ...any)  { sugar.Infof(format, args...) }
func Warnf(format string, args ...any)  { sugar.Warnf(format, args...) }
func Errorf(format string, args ...any) { sugar.Errorf(format, args...) }

func Debug(args ...any) { sugar.Debug(args...) }
func Info(args ...any)  { sugar.Info(args...) }
func Warn(args ...any)  { sugar.Warn(args...) }
func Error(args ...any) { sugar.Error(args...) }

// Sync 刷新底层缓冲；程序退出前调用。
func Sync() error { return sugar.Sync() }

// ---- 内部构造 ----

// newSugared 用给定 WriteSyncer 构造 sugared logger，便于测试注入 buffer。
func newSugared(sync zapcore.WriteSyncer) *zap.SugaredLogger {
	return newLogger(sync).Sugar()
}

func newLogger(sync zapcore.WriteSyncer) *zap.Logger {
	encCfg := zapcore.EncoderConfig{
		TimeKey:          "ts",
		LevelKey:         "level",
		NameKey:          zapcore.OmitKey,
		CallerKey:        zapcore.OmitKey,
		FunctionKey:      zapcore.OmitKey,
		MessageKey:       "msg",
		StacktraceKey:    zapcore.OmitKey,
		LineEnding:       zapcore.DefaultLineEnding,
		EncodeLevel:      encodeLevel,
		EncodeTime:       encodeTime,
		EncodeName:       nil,
		ConsoleSeparator: " ",
	}
	core := zapcore.NewCore(
		zapcore.NewConsoleEncoder(encCfg),
		sync,
		zapcore.InfoLevel,
	)
	return zap.New(core)
}

// encodeTime 格式化为 "2006-01-02 15:04:05"。
func encodeTime(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
	enc.AppendString(t.Format("2006-01-02 15:04:05"))
}

// encodeLevel 输出大写级别并左对齐填充至 6 字符，使消息列对齐。
func encodeLevel(lv zapcore.Level, enc zapcore.PrimitiveArrayEncoder) {
	enc.AppendString(fmt.Sprintf("%-6s", lv.CapitalString()))
}
```

- [ ] **Step 4: Run the logging tests to verify they pass**

Run:
```bash
go test ./internal/logging/...
```
Expected: **PASS** — all three tests green.

> Note: `package main` (`main.go`) still calls the old no-arg `logging.Init()` and will fail to compile, but `go test ./internal/logging/...` only compiles the `logging` package, so this task can pass independently. `main.go` is fixed in Task 3.

- [ ] **Step 5: Checkpoint (commit pending user approval)**

```bash
git status --short
```
Expected: `internal/logging/logger.go` modified, `internal/logging/logger_test.go` new. Pause for user before committing.

---

### Task 3: Update `main.go` to the new `Init` signature

**Files:**
- Modify: `main.go` (the `main()` first line, and `runServe`)

- [ ] **Step 1: Remove the stale `logging.Init()` call in `main()`**

In `main.go`, the function currently starts:
```go
func main() {
	logging.Init()

	cliApp := &cli.App{
```
Change it to remove the call (the package-level `var sugar` already defaults to stderr, so logs before `runServe` are not lost):
```go
func main() {
	cliApp := &cli.App{
```

- [ ] **Step 2: Call `logging.Init` inside `runServe` after building `cfg`**

`runServe` currently ends:
```go
	cfg := app.Config{
		Port:    c.String("port"),
		DataDir: c.String("dir"),
		Version: version,
		WebFS:   staticFS,
	}
	return app.Run(c.Context, cfg)
}
```
Insert the `Init` call between the `cfg` literal and `return app.Run`. Resolve the data dir with the same `./data` fallback `app.Config.dataDir()` uses (it is unexported, so `main` cannot call it). Result:
```go
	cfg := app.Config{
		Port:    c.String("port"),
		DataDir: c.String("dir"),
		Version: version,
		WebFS:   staticFS,
	}

	// 与 app.Config.dataDir() 一致：空值兜底 ./data，确保日志与 store 落在同一个目录。
	dataDir := cfg.DataDir
	if dataDir == "" {
		dataDir = "./data"
	}
	logging.Init(dataDir)

	return app.Run(c.Context, cfg)
}
```

- [ ] **Step 3: Verify the whole module compiles and vets**

Run:
```bash
go vet ./...
```
Expected: exits 0, no diagnostics. (Confirms `main.go` now matches the new `Init(dataDir)` signature and the `logging` import is still used.)

- [ ] **Step 4: Checkpoint (commit pending user approval)**

```bash
git status --short
```
Expected: only `main.go` modified. Pause for user before committing.

---

### Task 4: Full validation and manual smoke check

**Files:** none (verification only)

- [ ] **Step 1: Format**

Run:
```bash
gofmt -w main.go internal/logging
```
Expected: exits 0. Then confirm nothing spurious changed:
```bash
git diff --check
```
Expected: no whitespace errors.

- [ ] **Step 2: Vet + tests**

Run:
```bash
go vet ./...
go test ./...
```
Expected: both exit 0; all package tests pass.

- [ ] **Step 3: Production build**

Run:
```bash
CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .
```
Expected: produces `/tmp/homelab-panel-test` with no errors.

- [ ] **Step 4: Manual smoke check — file + stderr both receive logs**

Run (pick an ephemeral data dir, short run, then Ctrl-C):
```bash
rm -rf /tmp/hp-smoke && mkdir -p /tmp/hp-smoke
/tmp/homelab-panel-test serve --dir /tmp/hp-smoke --port 35902 &
HP_PID=$!
sleep 2
kill $HP_PID 2>/dev/null
```
Expected during the run: a line like `... INFO   starting server on :35902` prints to the terminal (stderr).
Then verify the file:
```bash
ls /tmp/hp-smoke/logs/ && cat /tmp/hp-smoke/logs/homelab-panel.log
```
Expected: `homelab-panel.log` exists and contains the same `starting server on :35902` line.

- [ ] **Step 5: Clean up smoke artifacts**

Run:
```bash
rm -rf /tmp/hp-smoke /tmp/homelab-panel-test
```
Expected: exits 0.

- [ ] **Step 6: Final checkpoint**

All changes are validated. Summarize the result to the user. Do not commit unless the user explicitly asks.

---

## Self-Review (completed during authoring)

- **Spec coverage:** spec §"`internal/logging/logger.go`" → Task 2; §"`main.go`" → Task 3; §"Dependency" → Task 1; §"Testing" three cases → Task 2 Step 1; §"Validation" commands → Task 4. Exit-cleanup "already present" noted (no task needed). `.gitignore` "no change needed" — covered by note, no task.
- **Placeholder scan:** none — every code step contains full code; every run step contains the exact command and expected output.
- **Type/signature consistency:** `Init(dataDir string)` is used identically in `logger.go`, the three tests (`Init(dir)`, `Init("")`), and `main.go` (`logging.Init(dataDir)`). Constants `logFilename`, `maxLogSizeMB`, `maxLogBackups`, `compressLogs` are referenced consistently.
