package handlers

import (
	"encoding/json"
	"errors"
	"homelab-panel/internal/logging"
	"homelab-panel/internal/panel"
	"net/http"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

type panelRequest struct {
	SiteName     string          `json:"site_name"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"search_engine"`
	Groups       []groupInput    `json:"groups"`
	Items        []itemInput     `json:"items"`
}

type groupInput struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
	Sort int    `json:"sort"`
}

type itemInput struct {
	ID          int            `json:"id"`
	GroupID     int            `json:"group_id"`
	Title       string         `json:"title"`
	URL         string         `json:"url"`
	BackupURL   string         `json:"backup_url"`
	Description string         `json:"description"`
	Icon        *data.ItemIcon `json:"icon"`
	Sort        int            `json:"sort"`
}

var (
	errGroupNameRequired = errors.New("group name is required")
	errItemTitleRequired = errors.New("item title is required")
	errItemURLRequired   = errors.New("item url is required")
	errItemGroupDangling = errors.New("item references unknown group")
)

func (h *Handler) GetPanel(c *gin.Context) {
	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, panelView(snap.Panel))
}

func (h *Handler) UpdatePanel(c *gin.Context) {
	var req panelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Config) == 0 {
		req.Config = json.RawMessage("{}")
	}
	if len(req.SearchEngine) == 0 {
		req.SearchEngine = json.RawMessage("{}")
	}

	snap := h.Store.Snapshot()
	// 注意：新 id 基于 snap.NextID 在锁外分配，随后在 Store.Save 闭包内推进 NextID。
	// 本服务为单管理员模型（无并发 PUT /panel），该窗口可接受；若未来支持并发写入，
	// 需将 id 分配移入 Store.Save 闭包（基于 d.NextID 实时分配）。
	normalized, err := normalizePanel(req, snap, snap.NextID)
	if err != nil {
		if errors.Is(err, errItemGroupDangling) {
			writeError(c, http.StatusConflict, err.Error())
			return
		}
		writeError(c, http.StatusBadRequest, err.Error())
		return
	}

	maxGroup, maxItem := maxExistingIDs(normalized)
	err = h.Store.Save(func(d *data.StoreData) error {
		d.Panel = normalized
		if maxGroup >= d.NextID.Group {
			d.NextID.Group = maxGroup + 1
		}
		if maxItem >= d.NextID.Item {
			d.NextID.Item = maxItem + 1
		}
		return nil
	})
	if err != nil {
		logging.Errorf("save panel failed: %v", err)
		writeError(c, http.StatusInternalServerError, "save panel failed")
		return
	}
	logging.Infof("panel updated: %d groups, %d items from %s",
		len(normalized.Groups), len(normalized.Items), c.ClientIP())
	writeJSON(c, http.StatusOK, panelView(normalized))
}

func normalizePanel(req panelRequest, snap data.StoreData, nextID data.NextID) (data.Panel, error) {
	now := time.Now()

	existingGroupByID := make(map[int]data.Group, len(snap.Panel.Groups))
	for _, g := range snap.Panel.Groups {
		existingGroupByID[g.ID] = g
	}
	existingItemByID := make(map[int]data.Item, len(snap.Panel.Items))
	for _, it := range snap.Panel.Items {
		existingItemByID[it.ID] = it
	}

	groups := make([]data.Group, 0, len(req.Groups))
	groupIDSet := make(map[int]bool, len(req.Groups))
	nextGroupID := nextID.Group
	for idx, g := range req.Groups {
		if g.Name == "" {
			return data.Panel{}, errGroupNameRequired
		}
		id := g.ID
		created := now
		if prev, ok := existingGroupByID[id]; ok && id != 0 {
			created = prev.CreatedAt
		} else {
			id = nextGroupID
			nextGroupID++
		}
		groupIDSet[id] = true
		sort := g.Sort
		if sort == 0 {
			sort = idx + 1
		}
		groups = append(groups, data.Group{
			ID:        id,
			Name:      g.Name,
			Icon:      g.Icon,
			Sort:      sort,
			CreatedAt: created,
			UpdatedAt: now,
		})
	}

	items := make([]data.Item, 0, len(req.Items))
	nextItemID := nextID.Item
	for idx, it := range req.Items {
		if it.Title == "" {
			return data.Panel{}, errItemTitleRequired
		}
		if it.URL == "" {
			return data.Panel{}, errItemURLRequired
		}
		if !groupIDSet[it.GroupID] {
			return data.Panel{}, errItemGroupDangling
		}
		if err := validateItemIcon(it.Icon); err != nil {
			return data.Panel{}, err
		}
		id := it.ID
		created := now
		if prev, ok := existingItemByID[id]; ok && id != 0 {
			created = prev.CreatedAt
		} else {
			id = nextItemID
			nextItemID++
		}
		sort := it.Sort
		if sort == 0 {
			sort = idx + 1
		}
		items = append(items, data.Item{
			ID:          id,
			GroupID:     it.GroupID,
			Title:       it.Title,
			URL:         it.URL,
			BackupURL:   it.BackupURL,
			Description: it.Description,
			Icon:        it.Icon,
			Sort:        sort,
			CreatedAt:   created,
			UpdatedAt:   now,
		})
	}

	return data.Panel{
		SiteName:     req.SiteName,
		Config:       req.Config,
		SearchEngine: req.SearchEngine,
		Groups:       groups,
		Items:        items,
	}, nil
}

// validateItemIcon 把 data 层图标模型转换为 panel 领域模型后复用统一校验。
// identifier/颜色等格式规则只存在于 panel.ValidateAppIcon 一处；这里仅表达
// Web 路径的指针语义：显式传入的 icon 对象不允许为空（保持既有 400 契约），
// icon 为 null 才表示无图标。
func validateItemIcon(icon *data.ItemIcon) error {
	if icon == nil {
		return nil
	}
	if *icon == (data.ItemIcon{}) {
		return errors.New("icon text is required")
	}

	return panel.ValidateAppIcon(panel.AppIcon{
		Text:            icon.Text,
		Color:           icon.Color,
		BackgroundColor: icon.BackgroundColor,
	})
}

func maxExistingIDs(p data.Panel) (int, int) {
	maxGroup, maxItem := 0, 0
	for _, g := range p.Groups {
		if g.ID > maxGroup {
			maxGroup = g.ID
		}
	}
	for _, it := range p.Items {
		if it.ID > maxItem {
			maxItem = it.ID
		}
	}
	return maxGroup, maxItem
}

func panelView(p data.Panel) gin.H {
	config := p.Config
	if len(config) == 0 {
		config = json.RawMessage("{}")
	}
	search := p.SearchEngine
	if len(search) == 0 {
		search = json.RawMessage("{}")
	}
	return gin.H{
		"site_name":     p.SiteName,
		"config":        config,
		"search_engine": search,
		"groups":        p.Groups,
		"items":         p.Items,
	}
}
