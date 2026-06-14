package handlers

import (
	"net/http"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

type settingRequest struct {
	SiteName      string `json:"siteName"`
	PublicEnabled bool   `json:"publicEnabled"`
	PublicUserID  uint   `json:"publicUserId"`
}

func (h *Handler) GetSetting(c *gin.Context) {
	var setting data.AppSetting
	if err := h.DB.First(&setting, 1).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load setting failed")
		return
	}
	c.JSON(http.StatusOK, setting)
}

func (h *Handler) UpdateSetting(c *gin.Context) {
	var req settingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.SiteName == "" {
		writeError(c, http.StatusBadRequest, "siteName is required")
		return
	}
	if req.PublicUserID == 0 {
		req.PublicUserID = 1
	}

	var count int64
	if err := h.DB.Model(&data.User{}).Where("id = ?", req.PublicUserID).Count(&count).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "load public user failed")
		return
	}
	if count == 0 {
		writeError(c, http.StatusBadRequest, "public user not found")
		return
	}

	setting := data.AppSetting{
		BaseModel:     data.BaseModel{ID: 1},
		SiteName:      req.SiteName,
		PublicEnabled: req.PublicEnabled,
		PublicUserID:  req.PublicUserID,
	}
	if err := h.DB.Save(&setting).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "save setting failed")
		return
	}
	c.JSON(http.StatusOK, setting)
}
