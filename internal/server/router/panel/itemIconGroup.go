package panel

import (
	"homelab-panel/internal/auth"
	"homelab-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitItemIconGroup(router *gin.RouterGroup) {
	itemIconGroup := api_v1.ApiGroupApp.ApiPanel.ItemIconGroup
	r := router.Group("", auth.LoginInterceptor)
	{
		r.POST("/panel/itemIconGroup/edit", itemIconGroup.Edit)
		r.POST("/panel/itemIconGroup/deletes", itemIconGroup.Deletes)
		r.POST("/panel/itemIconGroup/saveSort", itemIconGroup.SaveSort)
	}

	// 公开模式
	rPublic := router.Group("", auth.PublicModeInterceptor)
	{
		rPublic.POST("/panel/itemIconGroup/getList", itemIconGroup.GetList)
	}
}
