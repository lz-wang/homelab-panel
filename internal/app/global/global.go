package global

import (
	"io/fs"
	"sun-panel/internal/app/lib/cache"
	"sun-panel/internal/app/lib/cmn/systemSetting"
	"sun-panel/internal/app/lib/language"
	appConfig "sun-panel/internal/config"
	"sun-panel/internal/store/models"

	redis "github.com/redis/go-redis/v9"
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
	RedisDb             *redis.Client
	SystemSetting       *systemSetting.SystemSettingCache
	SystemMonitor       cache.Cacher[interface{}]
	RateLimit           *RateLimiter
	WebFS               fs.FS
)
