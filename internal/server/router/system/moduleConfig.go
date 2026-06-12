package system

import (
	"sun-panel/internal/auth"
	"sun-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitModuleConfigRouter(router *gin.RouterGroup) {
	api := api_v1.ApiGroupApp.ApiSystem.ModuleConfigApi
	r := router.Group("", auth.LoginInterceptor)
	r.POST("/system/moduleConfig/save", api.Save)

	// 公开模式
	rPublic := router.Group("", auth.PublicModeInterceptor)
	{
		rPublic.POST("/system/moduleConfig/getByName", api.GetByName)
	}
}
