package data

import (
	"encoding/json"
	"time"
)

type StoreData struct {
	Version   int       `json:"version"`
	Admin     Admin     `json:"admin"`
	Panel     Panel     `json:"panel"`
	Files     []File    `json:"files"`
	NextID    NextID    `json:"nextId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Admin struct {
	PasswordHash string    `json:"passwordHash"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Panel struct {
	SiteName     string          `json:"siteName"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"searchEngine"`
	Groups       []Group         `json:"groups"`
	Items        []Item          `json:"items"`
}

type Group struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon,omitempty"`
	Sort      int       `json:"sort"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"groupId"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	LANURL      string    `json:"lanUrl,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	OpenMethod  string    `json:"openMethod"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ItemIcon struct {
	ItemType        int    `json:"itemType"`
	Src             string `json:"src,omitempty"`
	Text            string `json:"text,omitempty"`
	BackgroundColor string `json:"backgroundColor,omitempty"`
}

type File struct {
	ID           int       `json:"id"`
	OriginalName string    `json:"originalName"`
	ObjectKey    string    `json:"objectKey"`
	MimeType     string    `json:"mimeType"`
	Size         int64     `json:"size"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"createdAt"`
}

type NextID struct {
	Group int `json:"group"`
	Item  int `json:"item"`
	File  int `json:"file"`
}
