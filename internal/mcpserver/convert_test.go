package mcpserver

import (
	"testing"

	"homelab-panel/internal/panel"
)

func TestNormalizeIconItemType(t *testing.T) {
	tests := []struct {
		name     string
		itemType int
		src      string
		text     string
		want     int
	}{
		{"explicit plain text", 1, "", "AB", 1},
		{"explicit image with src", 2, "https://x/a.png", "", 2},
		{"image type without src falls back to iconify", 2, "", "mdi:git", 3},
		{"explicit iconify", 3, "", "mdi:git", 3},
		{"omitted with text defaults to iconify", 0, "", "mdi:docker", 3},
		{"omitted with src defaults to image", 0, "/img/a.png", "", 2},
		{"omitted empty stays zero", 0, "", "", 0},
		{"unknown type with text infers iconify", 9, "", "mdi:cube", 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeIconItemType(tt.itemType, tt.src, tt.text); got != tt.want {
				t.Errorf("normalizeIconItemType(%d, %q, %q) = %d, want %d",
					tt.itemType, tt.src, tt.text, got, tt.want)
			}
		})
	}
}

// TestIconToPanelNormalizesType 验证 MCP 图标 DTO 经 iconToPanel 后 item_type 被归一化，
// 避免前端把 iconify 图标当图片渲染（历史 bug 的回归保护）。
func TestIconToPanelNormalizesType(t *testing.T) {
	got := iconToPanel(&AppIcon{ItemType: 2, Text: "mdi:git"})
	if got.ItemType != 3 {
		t.Errorf("iconToPanel item_type = %d, want 3 (iconify)", got.ItemType)
	}

	// nil icon → 空图标，item_type=0。
	if iconToPanel(nil).ItemType != 0 {
		t.Error("nil icon should yield zero item_type")
	}
}

func TestToPanelCreateInput(t *testing.T) {
	in := CreateAppInput{
		GroupID:     1,
		Title:       "t",
		URL:         "u",
		LANURL:      "lan",
		Description: "d",
		Icon:        &AppIcon{ItemType: 3, Text: "mdi:git", Color: "#FFFFFF", BackgroundColor: "#2196F3"},
		OpenMethod:  "new_tab",
		Sort:        5,
	}
	got := toPanelCreateInput(in)
	want := panel.AppInput{
		GroupID: 1, Title: "t", URL: "u", LANURL: "lan",
		Description: "d", OpenMethod: "new_tab", Sort: 5,
		Icon: panel.AppIcon{ItemType: 3, Text: "mdi:git", Color: "#FFFFFF", BackgroundColor: "#2196F3"},
	}
	if got != want {
		t.Errorf("toPanelCreateInput = %+v, want %+v", got, want)
	}
}

func TestToPanelReplaceInput(t *testing.T) {
	got := toPanelReplaceInput(ReplaceAppInput{ID: 7, GroupID: 2, Title: "r", URL: "ru", Sort: 9})
	if got.GroupID != 2 || got.Title != "r" || got.URL != "ru" || got.Sort != 9 {
		t.Errorf("toPanelReplaceInput fields not mapped: %+v", got)
	}
}

func TestToPanelPatchInput(t *testing.T) {
	t.Run("nil icon stays nil", func(t *testing.T) {
		got := toPanelPatchInput(PatchAppInput{ID: 1})
		if got.Icon != nil {
			t.Error("nil icon should stay nil")
		}
	})

	t.Run("pointers and icon mapped", func(t *testing.T) {
		title := "t"
		url := "u"
		sort := 3
		icon := AppIcon{ItemType: 2, Src: "https://x/a.png"}
		got := toPanelPatchInput(PatchAppInput{
			ID: 2, Title: &title, URL: &url, Sort: &sort, Icon: &icon,
		})
		if got.Title == nil || *got.Title != "t" {
			t.Errorf("title not mapped: %+v", got.Title)
		}
		if got.URL == nil || *got.URL != "u" {
			t.Errorf("url not mapped: %+v", got.URL)
		}
		if got.Sort == nil || *got.Sort != 3 {
			t.Errorf("sort not mapped: %+v", got.Sort)
		}
		if got.Icon == nil || got.Icon.ItemType != 2 || got.Icon.Src != "https://x/a.png" {
			t.Errorf("icon not mapped: %+v", got.Icon)
		}
	})
}

func TestToPanelGroupInput(t *testing.T) {
	got := toPanelGroupInput(CreateGroupInput{Name: "g", Sort: 3})
	if got.Name != "g" || got.Sort != 3 {
		t.Errorf("toPanelGroupInput = %+v, want {g 3}", got)
	}
}
