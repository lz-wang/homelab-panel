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
	normalized, err := panel.NewService(h.Store).ReplacePanel(c.Request.Context(), requestPanel(req))
	if err != nil {
		if errors.Is(err, panel.ErrAppGroupDangling) {
			writeError(c, http.StatusConflict, err.Error())
			return
		}
		writeError(c, http.StatusBadRequest, err.Error())
		return
	}

	logging.Infof("panel updated: %d groups, %d items from %s",
		len(normalized.Groups), len(normalized.Items), c.ClientIP())
	writeJSON(c, http.StatusOK, panelView(*normalized))
}

func requestPanel(req panelRequest) data.Panel {
	config, search := req.Config, req.SearchEngine
	if len(config) == 0 {
		config = json.RawMessage("{}")
	}
	if len(search) == 0 {
		search = json.RawMessage("{}")
	}
	groups := make([]data.Group, len(req.Groups))
	for i, group := range req.Groups {
		groups[i] = data.Group{ID: group.ID, Name: group.Name, Icon: group.Icon, Sort: group.Sort}
	}
	items := make([]data.Item, len(req.Items))
	for i, item := range req.Items {
		items[i] = data.Item{ID: item.ID, GroupID: item.GroupID, Title: item.Title, URL: item.URL, BackupURL: item.BackupURL, Description: item.Description, Icon: item.Icon, Sort: item.Sort}
	}
	return data.Panel{SiteName: req.SiteName, Config: config, SearchEngine: search, Groups: groups, Items: items}
}

func normalizePanel(req panelRequest, snap data.StoreData, nextID data.NextID) (data.Panel, error) {
	now := time.Now()
	config, err := panel.DecodePanelConfig(req.Config)
	if err != nil {
		return data.Panel{}, err
	}
	encodedConfig, err := panel.EncodePanelConfig(config)
	if err != nil {
		return data.Panel{}, err
	}

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
		Config:       encodedConfig,
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
