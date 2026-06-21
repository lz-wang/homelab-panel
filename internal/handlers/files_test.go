package handlers

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func newFilesHandler(t *testing.T) *Handler {
	t.Helper()
	h, _ := newAuthHandler(t)
	return h
}

func uploadOneFile(t *testing.T, r *gin.Engine) string {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", "a.txt")
	if err != nil {
		t.Fatal(err)
	}
	part.Write([]byte("hello"))
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/files", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("upload expected 201, got %d (body=%s)", w.Code, w.Body.String())
	}
	var saved []struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &saved); err != nil || len(saved) != 1 {
		t.Fatalf("unexpected upload response: %s", w.Body.String())
	}
	return saved[0].URL
}

func TestUploadListDeleteFile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := newFilesHandler(t)
	r := gin.New()
	r.POST("/files", h.UploadFiles)
	r.GET("/files", h.ListFiles)
	r.DELETE("/files/:id", h.DeleteFile)

	uploadOneFile(t, r)

	// list (newest first)
	req := httptest.NewRequest(http.MethodGet, "/files", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("list expected 200, got %d", w.Code)
	}
	var files []struct {
		ID           int    `json:"id"`
		OriginalName string `json:"original_name"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &files); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(files) != 1 || files[0].OriginalName != "a.txt" {
		t.Fatalf("unexpected files: %+v", files)
	}

	// delete by id
	req = httptest.NewRequest(http.MethodDelete, "/files/1", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("delete expected 204, got %d (body=%s)", w.Code, w.Body.String())
	}

	// delete again → 404
	req = httptest.NewRequest(http.MethodDelete, "/files/1", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("delete missing expected 404, got %d", w.Code)
	}
}

func TestUploadFilesRejectsEmptyForm(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := newFilesHandler(t)
	r := gin.New()
	r.POST("/files", h.UploadFiles)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/files", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestDeleteFileInvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := newFilesHandler(t)
	r := gin.New()
	r.DELETE("/files/:id", h.DeleteFile)

	req := httptest.NewRequest(http.MethodDelete, "/files/abc", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestRandomObjectName(t *testing.T) {
	name, err := randomObjectName("photo.PNG")
	if err != nil {
		t.Fatalf("randomObjectName: %v", err)
	}
	if len(name) < 12 {
		t.Errorf("name too short: %q", name)
	}
	if got := name[len(name)-4:]; got != ".png" {
		t.Errorf("extension = %q, want .png (lowercased)", got)
	}
}

func TestUploadServesStoredFile(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := newFilesHandler(t)
	r := gin.New()
	r.POST("/files", h.UploadFiles)
	r.GET("/uploads/*filepath", h.Upload)

	url := uploadOneFile(t, r)

	req := httptest.NewRequest(http.MethodGet, url, nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("serve expected 200, got %d", w.Code)
	}
	if w.Body.String() != "hello" {
		t.Errorf("served body = %q, want hello", w.Body.String())
	}
}
