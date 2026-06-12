package system

import (
	"homelab-panel/internal/auth"
	"homelab-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitMonitorRouter(router *gin.RouterGroup) {
	api := api_v1.ApiGroupApp.ApiSystem.MonitorApi
	r := router.Group("", auth.LoginInterceptor)
	r.POST("/system/monitor/getDiskMountpoints", api.GetDiskMountpoints)

	// 公开模式
	rPublic := router.Group("", auth.PublicModeInterceptor)
	{
		rPublic.POST("/system/monitor/getAll", api.GetAll)
		rPublic.POST("/system/monitor/getCpuState", api.GetCpuState)
		rPublic.POST("/system/monitor/getDiskStateByPath", api.GetDiskStateByPath)
		rPublic.POST("/system/monitor/getMemonyState", api.GetMemonyState)
	}
}
