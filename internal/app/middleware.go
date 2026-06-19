package app

import (
	"fmt"
	"homelab-panel/internal/logging"
	"time"

	"github.com/gin-gonic/gin"
)

// requestLogger 记录 /api/ 请求：IP Method Path Status Latency，并按状态码分级。
// 仅作用于 API 路由，避免 SPA 静态资源刷屏。
func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		ip := c.ClientIP()
		method := c.Request.Method
		path := c.Request.URL.Path
		status := c.Writer.Status()
		latency := time.Since(start).Round(time.Millisecond)

		msg := fmt.Sprintf("%s %s %s %d %s", ip, method, path, status, latency)
		switch {
		case status >= 500:
			logging.Error(msg)
		case status >= 400:
			logging.Warn(msg)
		default:
			logging.Info(msg)
		}
	}
}
