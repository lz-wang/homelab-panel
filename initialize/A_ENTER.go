package initialize

import (
	"fmt"
	"sun-panel/global"
	"sun-panel/initialize/cUserToken"
	appConfig "sun-panel/initialize/config"
	"sun-panel/initialize/database"
	"sun-panel/initialize/lang"
	"sun-panel/initialize/other"
	"sun-panel/initialize/redis"
	"sun-panel/initialize/runlog"
	"sun-panel/initialize/systemSettingCache"
	"sun-panel/initialize/userToken"
	"sun-panel/lib/cmn"
	"sun-panel/models"
	"sun-panel/structs"
	"time"

	"log"

	"github.com/gin-gonic/gin"
)

// var RUNCODE = "debug"
func InitApp() error {
	Logo()
	gin.SetMode(global.RUNCODE) // GIN 运行模式

	// 日志
	if logger, err := runlog.InitRunlog(global.RUNCODE, "running.log"); err != nil {
		log.Panicln("Log initialization error", err)
		panic(err)
	} else {
		global.Logger = logger
	}

	// 配置初始化
	{
		if config, err := appConfig.ConfigInit(); err != nil {
			global.Logger.Errorln("Configuration initialization error", err)
			return err
		} else {
			global.Config = config
		}
	}

	// 多语言初始化
	lang.LangInit("zh-cn") // en-us

	DatabaseConnect()

	// Redis 连接
	{
		// 判断是否有使用redis的驱动，没有将不连接
		cacheDrive := global.Config.GetValueString("base", "cache_drive")
		queueDrive := global.Config.GetValueString("base", "queue_drive")
		if cacheDrive == "redis" || queueDrive == "redis" {
			redisConfig := structs.IniConfigRedis{}
			global.Config.GetSection("redis", &redisConfig)
			rdb, err := redis.InitRedis(redis.Options{
				Addr:     redisConfig.Address,
				Password: redisConfig.Password,
				DB:       redisConfig.Db,
			})

			if err != nil {
				log.Panicln("Redis initialization error", err)
				panic(err)
				// return err
			}
			global.RedisDb = rdb
		}
	}

	// 初始化用户token
	global.UserToken = userToken.InitUserToken()
	global.CUserToken = cUserToken.InitCUserToken()

	// 其他的初始化
	global.VerifyCodeCachePool = other.InitVerifyCodeCachePool()
	global.SystemSetting = systemSettingCache.InItSystemSettingCache()
	global.SystemMonitor = global.NewCache[interface{}](5*time.Hour, -1, "systemMonitorCache")

	return nil
}

func DatabaseConnect() {
	// 数据库连接 - 开始
	dbClientInfo := &database.SQLiteConfig{
		Filename: global.Config.GetValueStringOrDefault("sqlite", "file_path"),
	}

	if db, err := database.DbInit(dbClientInfo); err != nil {
		log.Panicln("Database initialization error", err)
		panic(err)
	} else {
		global.Db = db
		models.Db = global.Db
	}

	database.CreateDatabase(global.Db)

	database.NotFoundAndCreateUser(global.Db)
}

func ResetAdminPassword() error {
	config, err := appConfig.ConfigInit()
	if err != nil {
		return err
	}
	global.Config = config

	DatabaseConnect()
	userInfo := models.User{}
	if err := global.Db.Where("role=?", 1).Order("id").First(&userInfo).Error; err != nil {
		return err
	}

	newPassword := "12345678"

	updateInfo := models.User{
		Password: cmn.PasswordEncryption(newPassword),
		Token:    "",
	}
	// 重置第一个管理员的密码
	if err := global.Db.Select("Password", "Token").Where("id=?", userInfo.ID).Updates(&updateInfo).Error; err != nil {
		return err
	}

	fmt.Println("The password has been successfully reset. Here is the account information")
	fmt.Println("Username ", userInfo.Username)
	fmt.Println("Password ", newPassword)
	return nil
}

func Logo() {
	fmt.Println("     ____            ___                __")
	fmt.Println("    / __/_ _____    / _ \\___ ____  ___ / /")
	fmt.Println("   _\\ \\/ // / _ \\  / ___/ _ `/ _ \\/ -_) / ")
	fmt.Println("  /___/\\_,_/_//_/ /_/   \\_,_/_//_/\\__/_/  ")
	fmt.Println("")

	versionInfo := cmn.GetSysVersionInfo()
	fmt.Println("Version:", versionInfo.Version)
	fmt.Println("Welcome to the Sun-Panel.")
	fmt.Println("Project address:", "https://github.com/hslr-s/sun-panel")

}
