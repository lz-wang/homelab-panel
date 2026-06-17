package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

func (h *Handler) UploadFiles(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid multipart form")
		return
	}

	incoming := form.File["files[]"]
	incoming = append(incoming, form.File["file"]...)
	if len(incoming) == 0 {
		writeError(c, http.StatusBadRequest, "file is required")
		return
	}

	saved := make([]data.File, 0, len(incoming))
	for _, header := range incoming {
		objectKey, err := randomObjectName(header.Filename)
		if err != nil {
			writeError(c, http.StatusInternalServerError, "generate object key failed")
			return
		}
		if err := c.SaveUploadedFile(header, filepath.Join(h.DataDir, "uploads", objectKey)); err != nil {
			writeError(c, http.StatusInternalServerError, "save upload failed")
			return
		}

		var file data.File
		err = h.Store.Save(func(d *data.StoreData) error {
			file = data.File{
				OriginalName: header.Filename,
				ObjectKey:    objectKey,
				MimeType:     header.Header.Get("Content-Type"),
				Size:         header.Size,
				URL:          "/uploads/" + objectKey,
				CreatedAt:    time.Now(),
			}
			file.ID = d.NextID.File
			d.NextID.File++
			d.Files = append(d.Files, file)
			return nil
		})
		if err != nil {
			writeError(c, http.StatusInternalServerError, "save file metadata failed")
			return
		}
		saved = append(saved, file)
	}
	writeJSON(c, http.StatusCreated, saved)
}

func (h *Handler) ListFiles(c *gin.Context) {
	snap := h.Store.Snapshot()
	// 倒序（最新在前）
	files := snap.Files
	out := make([]data.File, len(files))
	for i, f := range files {
		out[len(files)-1-i] = f
	}
	writeJSON(c, http.StatusOK, out)
}

func (h *Handler) DeleteFile(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid file id")
		return
	}

	var removed data.File
	var found bool
	err = h.Store.Save(func(d *data.StoreData) error {
		for i, f := range d.Files {
			if f.ID == id {
				removed = f
				found = true
				d.Files = append(d.Files[:i], d.Files[i+1:]...)
				return nil
			}
		}
		return nil
	})
	if err != nil {
		writeError(c, http.StatusInternalServerError, "delete file failed")
		return
	}
	if !found {
		writeError(c, http.StatusNotFound, "file not found")
		return
	}
	if err := os.Remove(filepath.Join(h.DataDir, "uploads", removed.ObjectKey)); err != nil && !errors.Is(err, os.ErrNotExist) {
		writeError(c, http.StatusInternalServerError, "remove file failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) Upload(c *gin.Context) {
	objectKey := strings.TrimPrefix(c.Param("filepath"), "/")
	if objectKey == "" || strings.Contains(objectKey, "..") {
		writeError(c, http.StatusBadRequest, "invalid file path")
		return
	}
	c.File(filepath.Join(h.DataDir, "uploads", objectKey))
}

func randomObjectName(originalName string) (string, error) {
	var buf [12]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf[:]) + strings.ToLower(filepath.Ext(originalName)), nil
}
