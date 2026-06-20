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
