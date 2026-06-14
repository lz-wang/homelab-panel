package handlers

import (
	"encoding/json"
	"net/http"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

type userConfigRequest struct {
	Panel        json.RawMessage `json:"panel"`
	SearchEngine json.RawMessage `json:"searchEngine"`
}

func (h *Handler) GetUserConfig(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var config data.UserConfig
	if err := h.DB.Where("user_id = ?", user.ID).First(&config).Error; err != nil {
		writeError(c, http.StatusNotFound, "user config not found")
		return
	}
	c.JSON(http.StatusOK, config)
}

func (h *Handler) UpdateUserConfig(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var req userConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}

	panel, err := normalizedJSON(req.Panel)
	if err != nil {
		writeError(c, http.StatusBadRequest, "panel must be valid json")
		return
	}
	searchEngine, err := normalizedJSON(req.SearchEngine)
	if err != nil {
		writeError(c, http.StatusBadRequest, "searchEngine must be valid json")
		return
	}

	var config data.UserConfig
	err = h.DB.Where("user_id = ?", user.ID).First(&config).Error
	if err != nil {
		config = data.UserConfig{UserID: user.ID}
	}
	config.Panel = panel
	config.SearchEngine = searchEngine

	if err := h.DB.Save(&config).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "save user config failed")
		return
	}
	c.JSON(http.StatusOK, config)
}

func normalizedJSON(raw json.RawMessage) (string, error) {
	if len(raw) == 0 {
		return "{}", nil
	}
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", err
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}
