package handlers

import (
	"net/http"

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
