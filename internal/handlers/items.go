package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type itemRequest struct {
	GroupID     uint   `json:"groupId"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	LANURL      string `json:"lanUrl"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	OpenMethod  string `json:"openMethod"`
	Sort        *int   `json:"sort"`
}

func (h *Handler) ListItems(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	query := h.DB.Where("user_id = ?", user.ID).Order("sort ASC, id ASC")
	if groupID := c.Query("groupId"); groupID != "" {
		query = query.Where("group_id = ?", groupID)
	}

	var items []data.Item
	if err := query.Find(&items).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "list items failed")
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) CreateItem(c *gin.Context) {
	item, ok := h.itemFromRequest(c)
	if !ok {
		return
	}
	if err := h.DB.Create(item).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "create item failed")
		return
	}
	writeCreated(c, item)
}

func (h *Handler) CreateItems(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var req []itemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	items := make([]data.Item, 0, len(req))
	for _, itemReq := range req {
		item, valid := h.buildItem(c, user.ID, itemReq)
		if !valid {
			return
		}
		items = append(items, *item)
	}

	if len(items) == 0 {
		c.JSON(http.StatusCreated, []data.Item{})
		return
	}
	if err := h.DB.Create(&items).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "create items failed")
		return
	}
	c.JSON(http.StatusCreated, items)
}

func (h *Handler) GetItem(c *gin.Context) {
	item, ok := h.itemForCurrentUser(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) UpdateItem(c *gin.Context) {
	item, ok := h.itemForCurrentUser(c)
	if !ok {
		return
	}

	var req itemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.GroupID != 0 {
		if !h.groupBelongsToUser(c, item.UserID, req.GroupID) {
			return
		}
		item.GroupID = req.GroupID
	}
	if req.Name != "" {
		item.Name = req.Name
	}
	if req.URL != "" {
		item.URL = req.URL
	}
	item.LANURL = req.LANURL
	item.Description = req.Description
	item.Icon = req.Icon
	if req.OpenMethod != "" {
		item.OpenMethod = req.OpenMethod
	}
	if req.Sort != nil {
		item.Sort = *req.Sort
	}

	if err := h.DB.Save(item).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "update item failed")
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) DeleteItem(c *gin.Context) {
	item, ok := h.itemForCurrentUser(c)
	if !ok {
		return
	}
	if err := h.DB.Delete(item).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "delete item failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateItemOrder(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var req []orderItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		for _, item := range req {
			if err := tx.Model(&data.Item{}).
				Where("id = ? AND user_id = ?", item.ID, user.ID).
				Update("sort", item.Sort).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		writeError(c, http.StatusInternalServerError, "update item order failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) itemFromRequest(c *gin.Context) (*data.Item, bool) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return nil, false
	}

	var req itemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return nil, false
	}
	return h.buildItem(c, user.ID, req)
}

func (h *Handler) buildItem(c *gin.Context, userID uint, req itemRequest) (*data.Item, bool) {
	if req.GroupID == 0 || req.Name == "" || req.URL == "" {
		writeError(c, http.StatusBadRequest, "groupId, name and url are required")
		return nil, false
	}
	if !h.groupBelongsToUser(c, userID, req.GroupID) {
		return nil, false
	}

	openMethod := req.OpenMethod
	if openMethod == "" {
		openMethod = "new_tab"
	}
	sort := 1000
	if req.Sort != nil {
		sort = *req.Sort
	}

	return &data.Item{
		UserID:      userID,
		GroupID:     req.GroupID,
		Name:        req.Name,
		URL:         req.URL,
		LANURL:      req.LANURL,
		Description: req.Description,
		Icon:        req.Icon,
		OpenMethod:  openMethod,
		Sort:        sort,
	}, true
}

func (h *Handler) itemForCurrentUser(c *gin.Context) (*data.Item, bool) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return nil, false
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid item id")
		return nil, false
	}

	var item data.Item
	err = h.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(c, http.StatusNotFound, "item not found")
		return nil, false
	}
	if err != nil {
		writeError(c, http.StatusInternalServerError, "load item failed")
		return nil, false
	}
	return &item, true
}

func (h *Handler) groupBelongsToUser(c *gin.Context, userID uint, groupID uint) bool {
	var count int64
	if err := h.DB.Model(&data.Group{}).Where("id = ? AND user_id = ?", groupID, userID).Count(&count).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load group failed")
		return false
	}
	if count == 0 {
		writeError(c, http.StatusNotFound, "group not found")
		return false
	}
	return true
}
