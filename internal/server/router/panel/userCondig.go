package panel

import (
	"homelab-panel/internal/auth"
	"homelab-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitUserConfig(router *gin.RouterGroup) {
	api := api_v1.ApiGroupApp.ApiPanel.UserConfig
	r := router.Group("", auth.LoginInterceptor)
	{
		r.POST("/panel/userConfig/set", api.Set)
	}

	// 公开模式
	rPublic := router.Group("", auth.PublicModeInterceptor)
	{
		rPublic.POST("/panel/userConfig/get", api.Get)
	}
}
