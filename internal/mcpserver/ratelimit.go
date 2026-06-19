package mcpserver

import (
	"sync"
	"time"
)

// rateBucket 是单个限流键的计数桶。
type rateBucket struct {
	count   int
	resetAt time.Time
}

// RateLimiter 是基于固定窗口的内存限流器，按 key（如 token+IP）独立计数。
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*rateBucket
	max     int
	window  time.Duration
}

// NewRateLimiter 构造一个每 window 最多允许 max 次的限流器。
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string]*rateBucket),
		max:     max,
		window:  window,
	}
}

// Allow 在 key 未超限时计数并返回 true，超限返回 false。
// 顺带回收过期桶，避免长期运行后桶表无限增长。
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	if len(rl.buckets) > sweepThreshold {
		rl.sweepLocked(now)
	}

	b, ok := rl.buckets[key]
	if !ok || now.After(b.resetAt) {
		b = &rateBucket{count: 0, resetAt: now.Add(rl.window)}
		rl.buckets[key] = b
	}
	if b.count >= rl.max {
		return false
	}
	b.count++
	return true
}

func (rl *RateLimiter) sweepLocked(now time.Time) {
	for k, b := range rl.buckets {
		if now.After(b.resetAt) {
			delete(rl.buckets, k)
		}
	}
}

// sweepThreshold 控制桶表回收阈值。
const sweepThreshold = 4096

// 按计划 Phase 14.2 配置三档限流（每分钟）：
//   - overall：任意 token+IP 的 MCP 请求总量
//   - write：写工具调用
//   - search：搜索工具调用
var (
	overallLimiter = NewRateLimiter(60, time.Minute)
	writeLimiter   = NewRateLimiter(10, time.Minute)
	searchLimiter  = NewRateLimiter(20, time.Minute)
)

// limiterForTool 按工具名返回对应的限流器；只读非搜索工具返回 nil（仅受 overall 约束）。
func limiterForTool(name string) *RateLimiter {
	switch name {
	case "homelab_panel_search_apps":
		return searchLimiter
	case "homelab_panel_rename_group",
		"homelab_panel_create_app",
		"homelab_panel_replace_app",
		"homelab_panel_patch_app":
		return writeLimiter
	default:
		return nil
	}
}

