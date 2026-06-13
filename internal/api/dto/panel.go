package dto

type ItemIconSaveSortRequest struct {
	SortItems       []SortRequestItem `json:"sortItems"`
	ItemIconGroupId uint              `json:"itemIconGroupId"`
}

type ItemIconGetSiteFaviconReq struct {
	Url string `json:"url"`
}

type ItemIconGetSiteFaviconResp struct {
	IconUrl string `json:"iconUrl"`
}
