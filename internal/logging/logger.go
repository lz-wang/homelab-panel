// Package logging 构造项目统一的 zap logger。
//
// 输出为易读的英文纯文本单行（非 JSON），格式：
//
//	2026-06-19 21:24:26 INFO   starting server on :3002
//
//	- 时间：2006-01-02 15:04:05
//	- 级别：大写、固定 6 字符宽左对齐，保证消息列对齐
//	- 默认写到 stderr，与 stdout 上的用户态输出分离
//	- 禁用 caller/stacktrace，确保始终单行
//
// 调用方应使用纯文本 message（不传 zap.String 等结构化字段），
// 控制台 encoder 在无字段时只输出 "time level message\n"。
package logging

import (
	"fmt"
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// NewLogger 返回写向 stderr 的项目标准 logger。
func NewLogger() *zap.Logger {
	return newLogger(zapcore.AddSync(os.Stderr))
}

// newLogger 使用给定的 WriteSyncer 构造 logger，便于测试注入 buffer。
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
