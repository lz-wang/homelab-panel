package data

import (
	"time"

	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type User struct {
	BaseModel

	Username     string `gorm:"size:64;uniqueIndex;not null" json:"username"`
	PasswordHash string `gorm:"size:255;not null" json:"-"`
	Name         string `gorm:"size:64" json:"name"`
	Email        string `gorm:"size:128" json:"email"`
	Role         string `gorm:"size:16;not null;default:user" json:"role"`
	Status       string `gorm:"size:16;not null;default:active" json:"status"`
}

type Session struct {
	BaseModel

	UserID    uint       `gorm:"index;not null" json:"userId"`
	TokenHash string     `gorm:"size:64;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time  `gorm:"index;not null" json:"expiresAt"`
	RevokedAt *time.Time `json:"revokedAt"`
}

type Group struct {
	BaseModel

	UserID uint   `gorm:"index;not null" json:"userId"`
	Name   string `gorm:"size:64;not null" json:"name"`
	Icon   string `gorm:"size:255" json:"icon"`
	Sort   int    `gorm:"not null;default:1000" json:"sort"`
}

type Item struct {
	BaseModel

	UserID      uint   `gorm:"index;not null" json:"userId"`
	GroupID     uint   `gorm:"index;not null" json:"groupId"`
	Name        string `gorm:"size:64;not null" json:"name"`
	URL         string `gorm:"size:1024;not null" json:"url"`
	LANURL      string `gorm:"size:1024" json:"lanUrl"`
	Description string `gorm:"size:1024" json:"description"`
	Icon        string `gorm:"type:text" json:"icon"`
	OpenMethod  string `gorm:"size:16;not null;default:new_tab" json:"openMethod"`
	Sort        int    `gorm:"not null;default:1000" json:"sort"`
}

type UserConfig struct {
	BaseModel

	UserID       uint   `gorm:"uniqueIndex;not null" json:"userId"`
	Panel        string `gorm:"type:text;not null;default:'{}'" json:"panel"`
	SearchEngine string `gorm:"type:text;not null;default:'{}'" json:"searchEngine"`
}

type AppSetting struct {
	BaseModel

	SiteName      string `gorm:"size:64;not null;default:Homelab Panel" json:"siteName"`
	PublicEnabled bool   `gorm:"not null;default:false" json:"publicEnabled"`
	PublicUserID  uint   `gorm:"not null;default:1" json:"publicUserId"`
}

type File struct {
	BaseModel

	UserID       uint   `gorm:"index;not null" json:"userId"`
	OriginalName string `gorm:"size:255;not null" json:"originalName"`
	ObjectKey    string `gorm:"size:512;uniqueIndex;not null" json:"objectKey"`
	MimeType     string `gorm:"size:128" json:"mimeType"`
	Size         int64  `gorm:"not null" json:"size"`
	URL          string `gorm:"size:1024;not null" json:"url"`
}
