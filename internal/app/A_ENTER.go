package app

import (
	"fmt"
	"homelab-panel/internal/app/cUserToken"
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/app/lib/cmn"
	"homelab-panel/internal/app/other"
	"homelab-panel/internal/app/systemSettingCache"
	"homelab-panel/internal/app/userToken"
	appLogger "homelab-panel/internal/logger"
	"homelab-panel/internal/store"
	"homelab-panel/internal/store/models"
	"path/filepath"
	"time"

	"log"

	"github.com/gin-gonic/gin"
)

func InitApp() error {
	Logo()
	gin.SetMode(global.RUNCODE) // GIN 运行模式

	// 日志
	if logger, err := appLogger.InitRunlog(global.RUNCODE); err != nil {
		log.Panicln("Log initialization error", err)
		panic(err)
	} else {
		global.Logger = logger
	}

	DatabaseConnect()

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
	dbClientInfo := &store.SQLiteConfig{
		Filename: filepath.Join(global.DataDir, "data.db"),
	}

	if db, err := store.DbInit(dbClientInfo); err != nil {
		log.Panicln("Database initialization error", err)
		panic(err)
	} else {
		global.Db = db
		models.Db = global.Db
	}

	store.CreateDatabase(global.Db)

	store.NotFoundAndCreateUser(global.Db)
}

func ResetAdminPassword() error {
	DatabaseConnect()
	userInfo := models.User{}
	if err := global.Db.Where("role=?", 1).Order("id").First(&userInfo).Error; err != nil {
		return err
	}

	newPassword := "admin"

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
	fmt.Println("Welcome to the Homelab Panel.")
	fmt.Println("Project address:", "https://github.com/hslr-s/homelab-panel")

}
