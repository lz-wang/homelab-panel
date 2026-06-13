package panel

import (
	"homelab-panel/internal/auth"
	"homelab-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitBackup(router *gin.RouterGroup) {
	api := api_v1.ApiGroupApp.ApiPanel.Backup
	r := router.Group("", auth.LoginInterceptor)
	{
		r.POST("/panel/backup/export", api.Export)
		r.POST("/panel/backup/import", api.Import)
	}
}
