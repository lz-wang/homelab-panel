package cache

import (
	"time"
)

// 缓存接口
type Cacher[T any] interface {
	// 设置
	Set(k string, v T, d time.Duration)

	// 取值
	Get(k string) (T, bool)

	// 设置-过期时间采用默认值
	SetDefault(k string, v T)

	// 删除
	Delete(k string)

	// 设置值，但不重置过期时间
	SetKeepExpiration(k string, v T)

	// 项目总数
	ItemCount() (int64, error)

	// 清空
	Flush()
}
