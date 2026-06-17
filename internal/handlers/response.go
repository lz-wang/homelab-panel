package handlers

import "github.com/gin-gonic/gin"

func writeError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func writeJSON(c *gin.Context, status int, value any) {
	c.JSON(status, value)
}
