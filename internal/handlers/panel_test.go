package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

func mustStore(t *testing.T) *data.Store {
	t.Helper()
	s, _, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"))
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
			{GroupID: 1, Title: "i1", URL: "https://a"},
			{GroupID: 2, Title: "i2", URL: "https://b"},
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
		Items:  []itemInput{{GroupID: 999, Title: "i1", URL: "https://a"}},
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

func TestNormalizeRejectsMissingItemTitle(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()
	req := panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items:  []itemInput{{GroupID: 1, Title: "", URL: "https://a"}},
	}
	if _, err := normalizePanel(req, snap, snap.NextID); err != errItemTitleRequired {
		t.Fatalf("expected errItemTitleRequired, got %v", err)
	}
}

func TestNormalizeRejectsMissingItemURL(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()
	req := panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items:  []itemInput{{GroupID: 1, Title: "i1", URL: ""}},
	}
	if _, err := normalizePanel(req, snap, snap.NextID); err != errItemURLRequired {
		t.Fatalf("expected errItemURLRequired, got %v", err)
	}
}

func TestNormalizeRejectsInvalidIcon(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()

	base := panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items: []itemInput{{
			GroupID: 1,
			Title:   "i1",
			URL:     "https://a",
		}},
	}

	t.Run("empty icon", func(t *testing.T) {
		req := base
		req.Items = append([]itemInput(nil), base.Items...)
		req.Items[0].Icon = &data.ItemIcon{}

		if _, err := normalizePanel(req, snap, snap.NextID); err == nil {
			t.Fatal("empty icon should fail")
		}
	})

	t.Run("invalid iconify name", func(t *testing.T) {
		req := base
		req.Items = append([]itemInput(nil), base.Items...)
		req.Items[0].Icon = &data.ItemIcon{
			Text: "plain-text",
		}

		if _, err := normalizePanel(req, snap, snap.NextID); err == nil {
			t.Fatal("invalid Iconify identifier should fail")
		}
	})

	t.Run("invalid color", func(t *testing.T) {
		req := base
		req.Items = append([]itemInput(nil), base.Items...)
		req.Items[0].Icon = &data.ItemIcon{
			Text:  "mdi:home",
			Color: "#FF0000",
		}

		if _, err := normalizePanel(req, snap, snap.NextID); err == nil {
			t.Fatal("invalid icon color should fail")
		}
	})

	t.Run("valid icon", func(t *testing.T) {
		req := base
		req.Items = append([]itemInput(nil), base.Items...)
		req.Items[0].Icon = &data.ItemIcon{
			Text:            "mdi:server-network",
			Color:           "#FFFFFF",
			BackgroundColor: "#2196F3",
		}

		if _, err := normalizePanel(req, snap, snap.NextID); err != nil {
			t.Fatalf("valid icon should pass: %v", err)
		}
	})
}

func TestUpdatePanelStatusCodes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := mustStore(t)
	h := NewHandler(Deps{Store: store, DataDir: t.TempDir()})
	r := gin.New()
	r.PUT("/api/v1/panel", h.RequireAdmin(), h.UpdatePanel)

	token, _, err := h.tokens.Issue()
	if err != nil {
		t.Fatalf("issue token: %v", err)
	}

	doPut := func(body any) *httptest.ResponseRecorder {
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal body: %v", err)
		}
		req := httptest.NewRequest(http.MethodPut, "/api/v1/panel", bytes.NewReader(raw))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	// 悬空 groupId → 409
	w := doPut(panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items:  []itemInput{{GroupID: 999, Title: "i1", URL: "https://a"}},
	})
	if w.Code != http.StatusConflict {
		t.Fatalf("dangling groupId: expected 409, got %d (body=%s)", w.Code, w.Body.String())
	}

	// 缺 title → 400
	w = doPut(panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items:  []itemInput{{GroupID: 1, Title: "", URL: "https://a"}},
	})
	if w.Code != http.StatusBadRequest {
		t.Fatalf("missing title: expected 400, got %d (body=%s)", w.Code, w.Body.String())
	}

	// 正常 → 200 且响应含 groups/items
	w = doPut(panelRequest{
		SiteName: "Lab",
		Groups:   []groupInput{{Name: "g1"}},
		Items:    []itemInput{{GroupID: 1, Title: "i1", URL: "https://a"}},
	})
	if w.Code != http.StatusOK {
		t.Fatalf("valid: expected 200, got %d (body=%s)", w.Code, w.Body.String())
	}
	var view gin.H
	if err := json.Unmarshal(w.Body.Bytes(), &view); err != nil {
		t.Fatalf("unmarshal view: %v", err)
	}
	groups, ok := view["groups"].([]any)
	if !ok || len(groups) != 1 {
		t.Fatalf("expected 1 group in response, got %v", view["groups"])
	}
	items, ok := view["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected 1 item in response, got %v", view["items"])
	}
}
