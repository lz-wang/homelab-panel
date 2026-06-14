package handlers

import (
	"net/http"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}

func (h *Handler) About(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"name":    "homelab-panel",
		"version": h.Version,
	})
}

func (h *Handler) PublicHome(c *gin.Context) {
	var setting data.AppSetting
	if err := h.DB.First(&setting, 1).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load setting failed")
		return
	}
	if !setting.PublicEnabled {
		writeError(c, http.StatusForbidden, "public access disabled")
		return
	}

	var config data.UserConfig
	if err := h.DB.Where("user_id = ?", setting.PublicUserID).First(&config).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load public config failed")
		return
	}

	var groups []data.Group
	if err := h.DB.Where("user_id = ?", setting.PublicUserID).Order("sort ASC, id ASC").Find(&groups).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load public groups failed")
		return
	}

	var items []data.Item
	if err := h.DB.Where("user_id = ?", setting.PublicUserID).Order("sort ASC, id ASC").Find(&items).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load public items failed")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"setting": setting,
		"config":  config,
		"groups":  groups,
		"items":   items,
	})
}
