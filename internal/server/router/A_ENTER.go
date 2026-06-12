package router

import (
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"
	_ "sun-panel/docs"
	"sun-panel/internal/app/global"
	// "sun-panel/internal/server/router/admin"
	"sun-panel/internal/server/router/openness"
	"sun-panel/internal/server/router/panel"
	"sun-panel/internal/server/router/system"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// 初始化总路由
func InitRouters(addr string) error {
	router := NewRouter()

	global.Logger.Info("Sun-Panel is Started.  Listening and serving HTTP on ", addr)
	return router.Run(addr)
}

func NewRouter() *gin.Engine {
	router := gin.Default()
	rootRouter := router.Group("/")
	routerGroup := rootRouter.Group("api")

	// 接口
	system.Init(routerGroup)
	panel.Init(routerGroup)
	openness.Init(routerGroup)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	registerWebRoutes(router)

	// 上传的文件
	sourcePath := global.Config.GetValueString("base", "source_path")
	router.Static(sourcePath[1:], sourcePath)

	return router
}

func registerWebRoutes(router *gin.Engine) {
	distFS, err := fs.Sub(global.WebFS, "web/dist")
	if err != nil {
		global.Logger.Warn("embedded web assets are unavailable: ", err)
		return
	}

	if assetsFS, err := fs.Sub(distFS, "assets"); err == nil {
		router.GET("/assets/*filepath", serveEmbeddedStatic(assetsFS))
		router.HEAD("/assets/*filepath", serveEmbeddedStatic(assetsFS))
	}
	if customFS, err := fs.Sub(distFS, "custom"); err == nil {
		router.GET("/custom/*filepath", serveEmbeddedStatic(customFS))
		router.HEAD("/custom/*filepath", serveEmbeddedStatic(customFS))
	}

	router.GET("/", serveEmbeddedIndex(distFS))
	router.GET("/favicon.ico", serveEmbeddedFile(distFS, "favicon.ico"))
	router.GET("/favicon.svg", serveEmbeddedFile(distFS, "favicon.svg"))
	router.NoRoute(func(c *gin.Context) {
		if shouldReturnNotFound(c.Request.URL.Path) {
			c.Status(http.StatusNotFound)
			return
		}
		serveEmbeddedIndex(distFS)(c)
	})
}

func shouldReturnNotFound(requestPath string) bool {
	for _, prefix := range []string{"/api", "/assets/", "/custom/", "/static/"} {
		if strings.HasPrefix(requestPath, prefix) {
			return true
		}
	}

	switch requestPath {
	case "/favicon.ico", "/favicon.svg", "/favicon-black.svg", "/logo.png":
		return true
	default:
		return false
	}
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

func serveEmbeddedStatic(root fs.FS) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := strings.TrimPrefix(c.Param("filepath"), "/")
		if name == "" || !fs.ValidPath(name) {
			c.Status(http.StatusNotFound)
			return
		}

		fileInfo, err := fs.Stat(root, name)
		if err != nil || fileInfo.IsDir() {
			c.Status(http.StatusNotFound)
			return
		}

		data, err := fs.ReadFile(root, name)
		if err != nil {
			c.Status(http.StatusNotFound)
			return
		}
		c.Data(http.StatusOK, embeddedContentType(name, data), data)
	}
}

func embeddedContentType(name string, data []byte) string {
	if contentType := mime.TypeByExtension(path.Ext(name)); contentType != "" {
		return contentType
	}
	return http.DetectContentType(data)
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
