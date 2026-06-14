package handlers

import (
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Static(c *gin.Context) {
	if strings.HasPrefix(c.Request.URL.Path, "/api/") {
		writeError(c, http.StatusNotFound, "not found")
		return
	}
	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		writeError(c, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	name := strings.TrimPrefix(path.Clean(c.Request.URL.Path), "/")
	if name == "." || name == "" {
		name = "index.html"
	}

	if stat, err := fs.Stat(h.WebFS, name); err == nil && !stat.IsDir() {
		c.FileFromFS(name, http.FS(h.WebFS))
		return
	}
	c.FileFromFS("index.html", http.FS(h.WebFS))
}
