package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type groupRequest struct {
	Name string `json:"name"`
	Icon string `json:"icon"`
	Sort *int   `json:"sort"`
}

type orderItemRequest struct {
	ID   uint `json:"id"`
	Sort int  `json:"sort"`
}

func (h *Handler) ListGroups(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var groups []data.Group
	if err := h.DB.Where("user_id = ?", user.ID).Order("sort ASC, id ASC").Find(&groups).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "list groups failed")
		return
	}
	c.JSON(http.StatusOK, groups)
}

func (h *Handler) CreateGroup(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var req groupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		writeError(c, http.StatusBadRequest, "name is required")
		return
	}

	group := data.Group{
		UserID: user.ID,
		Name:   req.Name,
		Icon:   req.Icon,
		Sort:   1000,
	}
	if req.Sort != nil {
		group.Sort = *req.Sort
	}
	if err := h.DB.Create(&group).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "create group failed")
		return
	}
	writeCreated(c, group)
}

func (h *Handler) GetGroup(c *gin.Context) {
	group, ok := h.groupForCurrentUser(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, group)
}

func (h *Handler) UpdateGroup(c *gin.Context) {
	group, ok := h.groupForCurrentUser(c)
	if !ok {
		return
	}

	var req groupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name != "" {
		group.Name = req.Name
	}
	group.Icon = req.Icon
	if req.Sort != nil {
		group.Sort = *req.Sort
	}

	if err := h.DB.Save(group).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "update group failed")
		return
	}
	c.JSON(http.StatusOK, group)
}

func (h *Handler) DeleteGroup(c *gin.Context) {
	group, ok := h.groupForCurrentUser(c)
	if !ok {
		return
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("group_id = ? AND user_id = ?", group.ID, group.UserID).Delete(&data.Item{}).Error; err != nil {
			return err
		}
		return tx.Delete(group).Error
	})
	if err != nil {
		writeError(c, http.StatusInternalServerError, "delete group failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateGroupOrder(c *gin.Context) {
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
			if err := tx.Model(&data.Group{}).
				Where("id = ? AND user_id = ?", item.ID, user.ID).
				Update("sort", item.Sort).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		writeError(c, http.StatusInternalServerError, "update group order failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) groupForCurrentUser(c *gin.Context) (*data.Group, bool) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return nil, false
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid group id")
		return nil, false
	}

	var group data.Group
	err = h.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&group).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(c, http.StatusNotFound, "group not found")
		return nil, false
	}
	if err != nil {
		writeError(c, http.StatusInternalServerError, "load group failed")
		return nil, false
	}
	return &group, true
}
