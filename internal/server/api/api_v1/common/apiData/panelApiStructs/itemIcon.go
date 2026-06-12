package panelApiStructs

import (
	"sun-panel/internal/server/api/api_v1/common/apiData/commonApiStructs"
	"sun-panel/internal/store/models"
)

type ItemIconEditRequest struct {
	models.ItemIcon
	IconJson string
}

type ItemIconSaveSortRequest struct {
	SortItems       []commonApiStructs.SortRequestItem `json:"sortItems"`
	ItemIconGroupId uint                               `json:"itemIconGroupId"`
}

type ItemIconGetSiteFaviconReq struct {
	Url string `json:"url"`
}

type ItemIconGetSiteFaviconResp struct {
	IconUrl string `json:"iconUrl"`
}
