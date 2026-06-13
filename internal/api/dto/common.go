// Package dto 存放各 HTTP 接口共用的请求/响应结构体，集中管理以避免过深的目录嵌套。
package dto

// RequestDeleteIds 批量删除请求（泛型支持 int/uint 主键）
type RequestDeleteIds[T int | uint] struct {
	Ids []T `json:"ids"`
}

type SortRequestItem struct {
	Id   uint `json:"id"`
	Sort uint `json:"sort"`
}

type SortRequest struct {
	SortItems []SortRequestItem `json:"sortItems"`
}
