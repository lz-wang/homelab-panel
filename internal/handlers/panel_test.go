package handlers

import (
	"encoding/json"
	"path/filepath"
	"testing"
	"time"

	"homelab-panel/internal/data"

	"go.uber.org/zap"
)

func mustStore(t *testing.T) *data.Store {
	t.Helper()
	logger, _ := zap.NewDevelopment()
	s, _, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"), logger)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	return s
}

func TestNormalizeAssignsIDsAndPreservesCreatedAt(t *testing.T) {
	store := mustStore(t)
	// 预置一个已存在分组（同步推进 NextID，模拟真实 Store 契约）
	existingCreatedAt := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	store.Save(func(d *data.StoreData) error {
		d.Panel.Groups = append(d.Panel.Groups, data.Group{ID: 1, Name: "g1", CreatedAt: existingCreatedAt})
		d.NextID.Group = 2
		return nil
	})
	snap := store.Snapshot()

	req := panelRequest{
		SiteName: "Lab",
		Config:   json.RawMessage(`{"logoText":"x"}`),
		Groups: []groupInput{
			{ID: 1, Name: "g1"}, // 已存在，保留
			{Name: "g2"},        // 新增
		},
		Items: []itemInput{
			{GroupID: 1, Title: "i1", URL: "https://a", OpenMethod: "new_tab"},
			{GroupID: 2, Title: "i2", URL: "https://b", OpenMethod: "new_tab"},
		},
	}

	out, err := normalizePanel(req, snap, store.Snapshot().NextID)
	if err != nil {
		t.Fatalf("normalize: %v", err)
	}
	if len(out.Groups) != 2 || out.Groups[0].ID != 1 || out.Groups[1].ID == 0 {
		t.Fatalf("groups = %+v", out.Groups)
	}
	if len(out.Items) != 2 || out.Items[0].ID == 0 {
		t.Fatalf("items = %+v", out.Items)
	}
	if out.Groups[0].CreatedAt.IsZero() {
		t.Fatal("existing group createdAt should be preserved")
	}
}

func TestNormalizeRejectsDanglingGroupRef(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()
	req := panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items:  []itemInput{{GroupID: 999, Title: "i1", URL: "https://a", OpenMethod: "new_tab"}},
	}
	_, err := normalizePanel(req, snap, snap.NextID)
	if err != errItemGroupDangling {
		t.Fatalf("expected errItemGroupDangling, got %v", err)
	}
}

func TestNormalizeRejectsMissingName(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()
	req := panelRequest{Groups: []groupInput{{Name: ""}}}
	if _, err := normalizePanel(req, snap, snap.NextID); err != errGroupNameRequired {
		t.Fatalf("expected errGroupNameRequired, got %v", err)
	}
}
