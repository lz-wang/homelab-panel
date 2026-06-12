package system

import (
	"homelab-panel/internal/app/lib/cmn"
	"homelab-panel/internal/server/api/api_v1/common/apiReturn"

	"github.com/gin-gonic/gin"
)

type About struct {
}

type AboutResponse struct {
	Code int       `json:"code"`
	Msg  string    `json:"msg"`
	Data AboutData `json:"data"`
}

type AboutData struct {
	VersionName string `json:"versionName"`
	VersionCode int    `json:"versionCode"`
}

// @Summary Get system version
// @Tags system
// @Produce json
// @Success 200 {object} AboutResponse
// @Router /about [post]
func (a *About) Get(c *gin.Context) {
	version := cmn.GetSysVersionInfo()
	apiReturn.SuccessData(c, gin.H{
		"versionName": version.Version,
		"versionCode": version.Version_code,
	})
}
