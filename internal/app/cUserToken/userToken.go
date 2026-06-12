package cUserToken

import (
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cache"

	"time"
)

func InitCUserToken() cache.Cacher[string] {
	return global.NewCache[string](72*time.Hour, 48*time.Hour, "CUserToken")
}
