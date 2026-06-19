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
	NextID    NextID    `json:"next_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Admin struct {
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Panel struct {
	SiteName     string          `json:"site_name"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"search_engine"`
	Groups       []Group         `json:"groups"`
	Items        []Item          `json:"items"`
}

type Group struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon,omitempty"`
	Sort      int       `json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	LANURL      string    `json:"lan_url,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	OpenMethod  string    `json:"open_method"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ItemIcon struct {
	ItemType        int    `json:"item_type"`
	Src             string `json:"src,omitempty"`
	Text            string `json:"text,omitempty"`
	Color           string `json:"color,omitempty"`
	BackgroundColor string `json:"background_color,omitempty"`
}

type File struct {
	ID           int       `json:"id"`
	OriginalName string    `json:"original_name"`
	ObjectKey    string    `json:"object_key"`
	MimeType     string    `json:"mime_type"`
	Size         int64     `json:"size"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"created_at"`
}

type NextID struct {
	Group int `json:"group"`
	Item  int `json:"item"`
	File  int `json:"file"`
}
