package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Health(c *gin.Context) {
	writeJSON(c, http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) About(c *gin.Context) {
	writeJSON(c, http.StatusOK, gin.H{
		"name":         "homelab-panel",
		"version":      h.Version,
		"repo":         "https://github.com/lz-wang/homelab-panel",
		"author":       aboutAuthor{Name: "lz-wang", URL: "https://github.com/lz-wang"},
		"backend_deps": parseGoModDeps(h.GoMod),
	})
}
