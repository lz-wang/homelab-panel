package systemSettingCache

import (
	"sun-panel/internal/app/global"
	"sun-panel/internal/app/lib/cmn/systemSetting"
	"time"
)

func InItSystemSettingCache() *systemSetting.SystemSettingCache {
	return &systemSetting.SystemSettingCache{
		Cache: global.NewCache[interface{}](5*time.Hour, -1, "systemSettingCache"),
	}
}
