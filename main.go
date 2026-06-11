package main

import (
	"embed"
	"log"
	embeddedAssets "sun-panel/assets"
	"sun-panel/global"
	"sun-panel/initialize"
	"sun-panel/router"
)

var version = "dev"

//go:embed web/dist
var webFS embed.FS

//go:embed assets/conf.example.ini assets/lang/en-us.ini assets/lang/zh-cn.ini assets/version
var assetsFS embed.FS

func main() {
	global.Version = version
	global.WebFS = webFS
	embeddedAssets.FS = assetsFS

	err := initialize.InitApp()
	if err != nil {
		log.Println("初始化错误:", err.Error())
		panic(err)
	}
	httpPort := global.Config.GetValueStringOrDefault("base", "http_port")

	if err := router.InitRouters(":" + httpPort); err != nil {
		panic(err)
	}
}
