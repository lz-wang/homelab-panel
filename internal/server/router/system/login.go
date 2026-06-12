package system

import (
	"sun-panel/internal/auth"
	"sun-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitLogin(router *gin.RouterGroup) {
	loginApi := api_v1.ApiGroupApp.ApiSystem.LoginApi

	router.POST("/login", loginApi.Login)
	router.POST("/logout", auth.LoginInterceptor, loginApi.Logout)

}
