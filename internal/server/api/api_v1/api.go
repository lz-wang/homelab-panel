package api_v1

import (
	"homelab-panel/internal/server/api/api_v1/openness"
	"homelab-panel/internal/server/api/api_v1/panel"
	"homelab-panel/internal/server/api/api_v1/system"
)

type ApiGroup struct {
	ApiSystem system.ApiSystem // 系统功能api
	ApiOpen   openness.ApiPpenness
	ApiPanel  panel.ApiPanel
}

var ApiGroupApp = new(ApiGroup)
