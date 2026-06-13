package router

import (
	"context"
	"errors"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
	"time"

	_ "homelab-panel/docs"
	"homelab-panel/internal/app/global"
	"homelab-panel/internal/server/router/openness"
	"homelab-panel/internal/server/router/panel"
	"homelab-panel/internal/server/router/system"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// 初始化总路由，启动 HTTP 服务并在收到中断信号后优雅关闭
func InitRouters(addr string) error {
	srv := &http.Server{
		Addr:    addr,
		Handler: NewRouter(),
	}

	// 异步启动监听，主流程阻塞在信号等待上以便优雅关闭
	go func() {
		global.Logger.Infof("Homelab Panel (version=%s) is Started. Listening and serving HTTP on %s", global.Version, addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			global.Logger.Errorf("HTTP server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	global.Logger.Infof("received signal %v, shutting down...", sig)

	// 给进行中的请求留出完成时间
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		global.Logger.Errorf("server shutdown error: %v", err)
		return err
	}

	global.Logger.Info("server exited gracefully")
	return nil
}

func NewRouter() *gin.Engine {
	router := gin.New()
	router.Use(ZapLoggerMiddleware(), ZapRecoveryMiddleware())
	rootRouter := router.Group("/")
	routerGroup := rootRouter.Group("api")

	// 接口
	system.Init(routerGroup)
	panel.Init(routerGroup)
	openness.Init(routerGroup)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	registerWebRoutes(router)

	// 上传的文件
	sourcePath := global.DataDir + "/uploads"
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
