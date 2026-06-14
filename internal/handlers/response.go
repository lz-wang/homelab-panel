package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func writeError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func writeCreated(c *gin.Context, value any) {
	c.JSON(http.StatusCreated, value)
}
