package app

import (
	"fmt"
	"homelab-panel/internal/logging"
	"net/http"
	"strings"
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

// LimitBodySize 限制请求体大小；超出时底层读取会返回错误。仅用于 MCP 等小请求体路由，
// 不影响文件上传等大请求体接口。
func LimitBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// MCPMaxBodyBytes 是 MCP endpoint 的请求体上限（1 MiB）。
const MCPMaxBodyBytes int64 = 1 << 20

// OriginCheck 校验 MCP endpoint 的 Origin 头，防御浏览器跨站请求：
//
//	空 Origin（CLI/Agent）放行；与请求同源放行；其他一律 403。
//
// SDK 自身已提供 localhost DNS rebinding 保护，此处补充跨源校验。
func OriginCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin == "" {
			c.Next()
			return
		}
		if sameOrigin(origin, c.Request.Host) {
			c.Next()
			return
		}
		logging.Warnf("mcp cross-origin rejected: origin=%s host=%s from %s",
			origin, c.Request.Host, c.ClientIP())
		c.AbortWithStatus(http.StatusForbidden)
	}
}

// sameOrigin 比较 origin 的 authority（host[:port]）与请求 Host 是否一致。
func sameOrigin(origin, host string) bool {
	idx := strings.Index(origin, "://")
	if idx < 0 {
		return false
	}
	rest := origin[idx+3:]
	if slash := strings.Index(rest, "/"); slash >= 0 {
		rest = rest[:slash]
	}
	return rest == host
}
