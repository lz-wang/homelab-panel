package dto

type GetReferralCodeResp struct {
	ReferralCode string `json:"referralCode"`
}

type NoticeGetListByDisplayTypeReq struct {
	DisplayType []int `json:"displayType"`
}
