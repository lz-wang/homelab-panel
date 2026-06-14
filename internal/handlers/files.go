package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (h *Handler) UploadFiles(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid multipart form")
		return
	}

	files := form.File["files[]"]
	files = append(files, form.File["file"]...)
	if len(files) == 0 {
		writeError(c, http.StatusBadRequest, "file is required")
		return
	}

	saved := make([]data.File, 0, len(files))
	for _, fileHeader := range files {
		file, err := h.saveUploadedFile(c, user.ID, fileHeader.Filename, fileHeader.Size)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		if err := c.SaveUploadedFile(fileHeader, filepath.Join(h.DataDir, "uploads", file.ObjectKey)); err != nil {
			writeError(c, http.StatusInternalServerError, "save upload failed")
			return
		}
		saved = append(saved, *file)
	}
	c.JSON(http.StatusCreated, saved)
}

func (h *Handler) ListFiles(c *gin.Context) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return
	}

	var files []data.File
	if err := h.DB.Where("user_id = ?", user.ID).Order("id DESC").Find(&files).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "list files failed")
		return
	}
	c.JSON(http.StatusOK, files)
}

func (h *Handler) GetFile(c *gin.Context) {
	file, ok := h.fileForCurrentUser(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, file)
}

func (h *Handler) DeleteFile(c *gin.Context) {
	file, ok := h.fileForCurrentUser(c)
	if !ok {
		return
	}

	if err := h.DB.Delete(file).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "delete file failed")
		return
	}
	if err := os.Remove(filepath.Join(h.DataDir, "uploads", file.ObjectKey)); err != nil && !errors.Is(err, os.ErrNotExist) {
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

func (h *Handler) saveUploadedFile(c *gin.Context, userID uint, originalName string, size int64) (*data.File, error) {
	objectKey := uuid.NewString() + strings.ToLower(filepath.Ext(originalName))
	file := data.File{
		UserID:       userID,
		OriginalName: originalName,
		ObjectKey:    objectKey,
		MimeType:     c.GetHeader("Content-Type"),
		Size:         size,
		URL:          "/uploads/" + objectKey,
	}
	if err := h.DB.Create(&file).Error; err != nil {
		return nil, fmt.Errorf("save file metadata failed")
	}
	return &file, nil
}

func (h *Handler) fileForCurrentUser(c *gin.Context) (*data.File, bool) {
	user, ok := currentUser(c)
	if !ok {
		writeError(c, http.StatusUnauthorized, "invalid user")
		return nil, false
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid file id")
		return nil, false
	}

	var file data.File
	err = h.DB.Where("id = ? AND user_id = ?", id, user.ID).First(&file).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(c, http.StatusNotFound, "file not found")
		return nil, false
	}
	if err != nil {
		writeError(c, http.StatusInternalServerError, "load file failed")
		return nil, false
	}
	return &file, true
}
