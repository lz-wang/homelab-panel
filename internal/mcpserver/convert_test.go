package mcpserver

import "testing"

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
