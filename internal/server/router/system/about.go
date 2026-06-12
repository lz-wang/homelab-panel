package system

import (
	"homelab-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitAbout(router *gin.RouterGroup) {
	about := api_v1.ApiGroupApp.ApiSystem.About
	{
		router.POST("about", about.Get)
	}
}
