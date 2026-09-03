package mcpserver

import (
	"testing"

	"homelab-panel/internal/panel"
)

// TestIconToPanel 验证 MCP 图标 DTO 经 iconToPanel 后 text 透传为 Iconify identifier，
// nil 视为零值图标。
func TestIconToPanel(t *testing.T) {
	got := iconToPanel(&AppIcon{Text: "mdi:git", Color: "#FFFFFF"})
	if got.Text != "mdi:git" || got.Color != "#FFFFFF" {
		t.Errorf("iconToPanel = %+v, want text mdi:git with color", got)
	}

	if iconToPanel(nil) != (panel.AppIcon{}) {
		t.Error("nil icon should yield zero AppIcon")
	}
}

func TestToPanelCreateInput(t *testing.T) {
	in := CreateAppInput{
		GroupID:     1,
		Title:       "t",
		URL:         "u",
		BackupURL:   "bu",
		Description: "d",
		Icon:        &AppIcon{Text: "mdi:git", Color: "#FFFFFF", BackgroundColor: "#2196F3"},
		Sort:        5,
	}
	got := toPanelCreateInput(in)
	want := panel.AppInput{
		GroupID: 1, Title: "t", URL: "u", BackupURL: "bu",
		Description: "d", Sort: 5,
		Icon: panel.AppIcon{Text: "mdi:git", Color: "#FFFFFF", BackgroundColor: "#2196F3"},
	}
	if got != want {
		t.Errorf("toPanelCreateInput = %+v, want %+v", got, want)
	}
}

func TestToPanelReplaceInput(t *testing.T) {
	got := toPanelReplaceInput(ReplaceAppInput{ID: 7, GroupID: 2, Title: "r", URL: "ru", BackupURL: "rbu", Sort: 9})
	if got.GroupID != 2 || got.Title != "r" || got.URL != "ru" || got.BackupURL != "rbu" || got.Sort != 9 {
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
		bak := "bu"
		sort := 3
		icon := AppIcon{Text: "mdi:git", Color: "#000000"}
		got := toPanelPatchInput(PatchAppInput{
			ID: 2, Title: &title, URL: &url, BackupURL: &bak, Sort: &sort, Icon: &icon,
		})
		if got.Title == nil || *got.Title != "t" {
			t.Errorf("title not mapped: %+v", got.Title)
		}
		if got.URL == nil || *got.URL != "u" {
			t.Errorf("url not mapped: %+v", got.URL)
		}
		if got.BackupURL == nil || *got.BackupURL != "bu" {
			t.Errorf("backup_url not mapped: %+v", got.BackupURL)
		}
		if got.Sort == nil || *got.Sort != 3 {
			t.Errorf("sort not mapped: %+v", got.Sort)
		}
		if got.Icon == nil || got.Icon.Text != "mdi:git" || got.Icon.Color != "#000000" {
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
