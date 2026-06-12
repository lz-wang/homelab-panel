package userToken

import (
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cache"
	"homelab-panel/internal/store/models"

	"time"
)

func InitUserToken() cache.Cacher[models.User] {
	return global.NewCache[models.User](1*time.Minute, 1*time.Hour, "UserToken")
}
