package system

import (
	"sun-panel/internal/auth"
	"sun-panel/internal/server/api/api_v1"

	"github.com/gin-gonic/gin"
)

func InitFileRouter(router *gin.RouterGroup) {
	FileApi := api_v1.ApiGroupApp.ApiSystem.FileApi

	// 验证项目的权限(有访问密码的需要验证访问token)
	private := router.Group("", auth.LoginInterceptor)
	{
		private.POST("/file/uploadImg", FileApi.UploadImg)
		private.POST("/file/uploadFiles", FileApi.UploadFiles)

		private.POST("/file/getList", FileApi.GetList)
		private.POST("/file/deletes", FileApi.Deletes)

	}

}
