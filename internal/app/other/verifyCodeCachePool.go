package other

import (
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cache"
	"time"
)

func InitVerifyCodeCachePool() cache.Cacher[string] {
	return global.NewCache[string](10*time.Minute, 10*time.Minute, "VerifyCodeCachePool")

}
