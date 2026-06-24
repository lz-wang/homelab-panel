package data

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestStoreDataUsesSnakeCaseJSONKeys(t *testing.T) {
	now := time.Date(2026, 6, 19, 0, 0, 0, 0, time.UTC)
	d := StoreData{
		Admin: Admin{
			PasswordHash: "hash",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		Panel: Panel{
			SiteName:     "Lab",
			Config:       json.RawMessage(`{}`),
			SearchEngine: json.RawMessage(`{}`),
			Groups: []Group{
				{ID: 1, Name: "g1", CreatedAt: now, UpdatedAt: now},
			},
			Items: []Item{
				{
					ID: 1, GroupID: 1, Title: "i", URL: "https://a", BackupURL: "https://b",
					Icon:      &ItemIcon{ItemType: 1, BackgroundColor: "#fff"},
					CreatedAt: now, UpdatedAt: now,
				},
			},
		},
		Files: []File{
			{ID: 1, OriginalName: "f.png", ObjectKey: "k", MimeType: "image/png", Size: 1, URL: "/u", CreatedAt: now},
		},
		NextID:    NextID{Group: 2, Item: 2, File: 2},
		CreatedAt: now,
		UpdatedAt: now,
	}

	raw, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)

	for _, k := range []string{
		`"next_id"`, `"created_at"`, `"updated_at"`, `"password_hash"`,
		`"site_name"`, `"search_engine"`, `"group_id"`, `"backup_url"`,
		`"item_type"`, `"background_color"`,
		`"original_name"`, `"object_key"`, `"mime_type"`,
	} {
		if !strings.Contains(got, k) {
			t.Errorf("expected snake_case key %s in JSON, got: %s", k, got)
		}
	}
	for _, k := range []string{
		`"nextId"`, `"createdAt"`, `"updatedAt"`, `"passwordHash"`,
		`"siteName"`, `"searchEngine"`, `"groupId"`, `"backupUrl"`,
		`"itemType"`, `"backgroundColor"`,
		`"originalName"`, `"objectKey"`, `"mimeType"`,
	} {
		if strings.Contains(got, k) {
			t.Errorf("camelCase key %s should not appear, got: %s", k, got)
		}
	}
}
