package handlers

import (
	"errors"
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

	if h.serveStaticFile(c, name) {
		return
	}
	h.serveStaticFile(c, "index.html")
}

func (h *Handler) serveStaticFile(c *gin.Context, name string) bool {
	file, err := h.WebFS.Open(name)
	if err != nil {
		return false
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil || stat.IsDir() {
		return false
	}

	reader, ok := file.(interface {
		Read([]byte) (int, error)
		Seek(int64, int) (int64, error)
	})
	if !ok {
		writeError(c, http.StatusInternalServerError, "static file is not seekable")
		return true
	}

	if _, err := reader.Seek(0, 0); err != nil && !errors.Is(err, fs.ErrInvalid) {
		writeError(c, http.StatusInternalServerError, "read static file failed")
		return true
	}

	// Vite 构建产物带内容哈希（index-AbCd1234.js），内容变化即换文件名，
	// 适合一年 immutable；index.html 必须每次校验以引用新哈希文件。
	if strings.HasPrefix(name, "assets/") {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
	} else if name == "index.html" {
		c.Header("Cache-Control", "no-cache")
	}

	http.ServeContent(c.Writer, c.Request, path.Base(name), stat.ModTime(), reader)
	return true
}
