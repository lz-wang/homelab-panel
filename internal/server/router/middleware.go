package router

import (
	"time"

	"homelab-panel/internal/app/global"

	"github.com/gin-gonic/gin"
)

// ZapLoggerMiddleware 通过 zap 记录每个 HTTP 请求
func ZapLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		msg := path
		if query != "" {
			msg += "?" + query
		}

		if len(c.Errors) > 0 {
			global.Logger.Errorf("[GIN] %d | %v | %s | %s | %s",
				status, latency, c.ClientIP(), msg, c.Errors.String())
			return
		}

		switch {
		case status >= 500:
			global.Logger.Errorf("[GIN] %d | %v | %s | %s",
				status, latency, c.ClientIP(), msg)
		case status >= 400:
			global.Logger.Warnf("[GIN] %d | %v | %s | %s",
				status, latency, c.ClientIP(), msg)
		default:
			global.Logger.Infof("[GIN] %d | %v | %s | %s",
				status, latency, c.ClientIP(), msg)
		}
	}
}

// ZapRecoveryMiddleware 通过 zap 记录 panic 恢复
func ZapRecoveryMiddleware() gin.HandlerFunc {
	return gin.CustomRecoveryWithWriter(gin.DefaultErrorWriter, func(c *gin.Context, recovered interface{}) {
		global.Logger.Errorf("[GIN] panic recovered: %v", recovered)
		c.AbortWithStatus(500)
	})
}
