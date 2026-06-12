package store

import (
	"context"
	"fmt"
	"time"

	"homelab-panel/internal/app/global"

	"gorm.io/gorm/logger"
)

type ZapGormLogger struct {
	level logger.LogLevel
}

func NewZapGormLogger() *ZapGormLogger {
	return &ZapGormLogger{
		level: logger.Warn,
	}
}

func (l *ZapGormLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	newLogger.level = level
	return &newLogger
}

func (l *ZapGormLogger) Info(_ context.Context, msg string, args ...interface{}) {
	if l.level >= logger.Info {
		global.Logger.Infof("[GORM] "+msg, args...)
	}
}

func (l *ZapGormLogger) Warn(_ context.Context, msg string, args ...interface{}) {
	if l.level >= logger.Warn {
		global.Logger.Warnf("[GORM] "+msg, args...)
	}
}

func (l *ZapGormLogger) Error(_ context.Context, msg string, args ...interface{}) {
	if l.level >= logger.Error {
		global.Logger.Errorf("[GORM] "+msg, args...)
	}
}

func (l *ZapGormLogger) Trace(_ context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	if l.level <= logger.Silent {
		return
	}

	elapsed := time.Since(begin)
	sql, rows := fc()

	switch {
	case err != nil && l.level >= logger.Error:
		global.Logger.Errorf("[GORM] %s | %d rows | %v | %s", elapsed, rows, err, sql)
	case elapsed > time.Second && l.level >= logger.Warn:
		global.Logger.Warnf("[GORM] slow sql: %s | %d rows | %s", elapsed, rows, sql)
	case l.level >= logger.Info:
		global.Logger.Infof("[GORM] %s | %d rows | %s", elapsed, rows, sql)
	}
}

// Ensure ZapGormLogger implements logger.Interface at compile time.
var _ logger.Interface = (*ZapGormLogger)(nil)

// FormatDuration 提供统一的时间格式化
func FormatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%.3fms", float64(d.Microseconds())/1000.0)
	}
	return d.String()
}
