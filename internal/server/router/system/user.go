package system

import (
	"sun-panel/internal/auth"
	"sun-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitUserRouter(router *gin.RouterGroup) {
	api := api_v1.ApiGroupApp.ApiSystem.UserApi
	r := router.Group("", auth.LoginInterceptor)
	r.POST("/user/getInfo", api.GetInfo)
	r.POST("/user/updatePassword", api.UpdatePasssword)
	r.POST("/user/updateInfo", api.UpdateInfo)
	r.POST("/user/getReferralCode", api.GetReferralCode)

	// 公开模式
	rPublic := router.Group("", auth.PublicModeInterceptor)
	{
		rPublic.POST("/user/getAuthInfo", api.GetAuthInfo)
	}
}
