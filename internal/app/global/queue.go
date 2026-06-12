package global

import (
	"homelab-panel/internal/app/lib/queue"
	"homelab-panel/internal/app/lib/queue/queueMemory"
)

// 创建一个队列
// name:缓存名称
func NewQueuer(name string) queue.Queuer {
	return queueMemory.New()
}
