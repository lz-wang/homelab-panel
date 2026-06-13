package models

import (
	"time"

	"gorm.io/gorm"
)

// int类型代表是否的常量
const (
	INT_FALSE = iota
	INT_TURE
)

type BaseModel struct {
	gorm.Model
	// Db *gorm.DB `gorm:"_"`
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"createTime"`
	UpdatedAt time.Time `json:"updateTime"`
	// DeletedAt DeletedAt `gorm:"index"`
}

type BaseModelNoId struct {
	CreatedAt time.Time      `json:"createTime"`
	UpdatedAt time.Time      `json:"updateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// 分页的结构体
type PageLimitStruct struct {
	PageSize  int `gorm:"-"` //
	LimitSize int `gorm:"-"` //
}

// 计算分页
func calcPage(page_size, limit_size int) (offset, limit int) {
	offset = limit_size * (page_size - 1)
	limit = limit_size
	return
}
