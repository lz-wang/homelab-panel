package system

import (
	"homelab-panel/internal/app/global"
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
	Version string `json:"version"`
}

// @Summary Get system version
// @Tags system
// @Produce json
// @Success 200 {object} AboutResponse
// @Router /about [post]
func (a *About) Get(c *gin.Context) {
	apiReturn.SuccessData(c, gin.H{
		"version": global.Version,
	})
}
