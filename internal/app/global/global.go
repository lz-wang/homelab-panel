package global

import (
	"homelab-panel/internal/app/lib/cache"
	"homelab-panel/internal/app/lib/cmn/systemSetting"
	"homelab-panel/internal/app/lib/language"
	appConfig "homelab-panel/internal/config"
	"homelab-panel/internal/store/models"
	"io/fs"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

var (
	RUNCODE = "debug" // 运行模式：debug | release
	Version = "dev"
)

// var Log *cmn.LogStruct

var (
	Lang *language.LangStructObj

	UserToken           cache.Cacher[models.User]
	CUserToken          cache.Cacher[string] // 用户token
	Logger              *zap.SugaredLogger
	LoggerLevel         = zap.NewAtomicLevel() // 支持通过http以及配置文件动态修改日志级别
	VerifyCodeCachePool cache.Cacher[string]
	Config              *appConfig.Config
	Db                  *gorm.DB
	SystemSetting       *systemSetting.SystemSettingCache
	SystemMonitor       cache.Cacher[interface{}]
	RateLimit           *RateLimiter
	WebFS               fs.FS
)
