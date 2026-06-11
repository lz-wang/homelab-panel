package router

import (
	"io/fs"
	"net/http"
	"strings"
	"sun-panel/global"
	// "sun-panel/router/admin"
	"sun-panel/router/openness"
	"sun-panel/router/panel"
	"sun-panel/router/system"

	"github.com/gin-gonic/gin"
)

// 初始化总路由
func InitRouters(addr string) error {
	router := gin.Default()
	rootRouter := router.Group("/")
	routerGroup := rootRouter.Group("api")

	// 接口
	system.Init(routerGroup)
	panel.Init(routerGroup)
	openness.Init(routerGroup)

	registerWebRoutes(router)

	// 上传的文件
	sourcePath := global.Config.GetValueString("base", "source_path")
	router.Static(sourcePath[1:], sourcePath)

	global.Logger.Info("Sun-Panel is Started.  Listening and serving HTTP on ", addr)
	return router.Run(addr)
}

func registerWebRoutes(router *gin.Engine) {
	distFS, err := fs.Sub(global.WebFS, "web/dist")
	if err != nil {
		global.Logger.Warn("embedded web assets are unavailable: ", err)
		return
	}

	if assetsFS, err := fs.Sub(distFS, "assets"); err == nil {
		router.StaticFS("/assets", http.FS(assetsFS))
	}
	if customFS, err := fs.Sub(distFS, "custom"); err == nil {
		router.StaticFS("/custom", http.FS(customFS))
	}

	router.GET("/", serveEmbeddedIndex(distFS))
	router.GET("/favicon.ico", serveEmbeddedFile(distFS, "favicon.ico"))
	router.GET("/favicon.svg", serveEmbeddedFile(distFS, "favicon.svg"))
	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.Status(http.StatusNotFound)
			return
		}
		serveEmbeddedIndex(distFS)(c)
	})
}

func serveEmbeddedIndex(distFS fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		data, err := fs.ReadFile(distFS, "index.html")
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", data)
	}
}

func serveEmbeddedFile(distFS fs.FS, name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, err := fs.Stat(distFS, name); err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.FileFromFS(name, http.FS(distFS))
	}
}
