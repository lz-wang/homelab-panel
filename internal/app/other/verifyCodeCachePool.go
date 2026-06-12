package other

import (
	"sun-panel/internal/app/global"
	"sun-panel/internal/app/lib/cache"
	"time"
)

func InitVerifyCodeCachePool() cache.Cacher[string] {
	return global.NewCache[string](10*time.Minute, 10*time.Minute, "VerifyCodeCachePool")

}
