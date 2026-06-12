package systemSettingCache

import (
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cmn/systemSetting"
	"time"
)

func InItSystemSettingCache() *systemSetting.SystemSettingCache {
	return &systemSetting.SystemSettingCache{
		Cache: global.NewCache[interface{}](5*time.Hour, -1, "systemSettingCache"),
	}
}
