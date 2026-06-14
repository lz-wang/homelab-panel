package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type userRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	Status   string `json:"status"`
}

func (h *Handler) ListUsers(c *gin.Context) {
	var users []data.User
	if err := h.DB.Order("id ASC").Find(&users).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "list users failed")
		return
	}
	c.JSON(http.StatusOK, users)
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req userRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Username == "" || req.Password == "" {
		writeError(c, http.StatusBadRequest, "username and password are required")
		return
	}
	if len(req.Password) < 6 {
		writeError(c, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "hash password failed")
		return
	}

	user := data.User{
		Username:     req.Username,
		PasswordHash: string(hash),
		Name:         req.Name,
		Email:        req.Email,
		Role:         normalizeRole(req.Role),
		Status:       normalizeStatus(req.Status),
	}
	if err := h.DB.Create(&user).Error; err != nil {
		if isUniqueError(err) {
			writeError(c, http.StatusConflict, "username already exists")
			return
		}
		writeError(c, http.StatusInternalServerError, "create user failed")
		return
	}
	if err := seedUserConfigForHandler(h.DB, user.ID); err != nil {
		writeError(c, http.StatusInternalServerError, "create user config failed")
		return
	}
	writeCreated(c, user)
}

func (h *Handler) GetUser(c *gin.Context) {
	user, ok := h.userByID(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) UpdateUser(c *gin.Context) {
	user, ok := h.userByID(c)
	if !ok {
		return
	}

	var req userRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Username != "" {
		user.Username = req.Username
	}
	user.Name = req.Name
	user.Email = req.Email
	if req.Role != "" {
		user.Role = normalizeRole(req.Role)
	}
	if req.Status != "" {
		user.Status = normalizeStatus(req.Status)
	}

	if err := h.DB.Save(user).Error; err != nil {
		if isUniqueError(err) {
			writeError(c, http.StatusConflict, "username already exists")
			return
		}
		writeError(c, http.StatusInternalServerError, "update user failed")
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	user, ok := h.userByID(c)
	if !ok {
		return
	}
	current, currentOK := currentUser(c)
	if currentOK && current.ID == user.ID {
		writeError(c, http.StatusBadRequest, "cannot delete current user")
		return
	}

	if err := h.DB.Delete(user).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "delete user failed")
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateUserPassword(c *gin.Context) {
	user, ok := h.userByID(c)
	if !ok {
		return
	}

	var req struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Password) < 6 {
		writeError(c, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "hash password failed")
		return
	}
	if err := h.DB.Model(user).Update("password_hash", string(hash)).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "update password failed")
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) userByID(c *gin.Context) (*data.User, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid user id")
		return nil, false
	}

	var user data.User
	err = h.DB.First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(c, http.StatusNotFound, "user not found")
		return nil, false
	}
	if err != nil {
		writeError(c, http.StatusInternalServerError, "load user failed")
		return nil, false
	}
	return &user, true
}

func normalizeRole(role string) string {
	if role == "admin" {
		return "admin"
	}
	return "user"
}

func normalizeStatus(status string) string {
	if status == "disabled" {
		return "disabled"
	}
	return "active"
}

func isUniqueError(err error) bool {
	return strings.Contains(strings.ToLower(err.Error()), "unique")
}

func seedUserConfigForHandler(db *gorm.DB, userID uint) error {
	config := data.UserConfig{
		UserID:       userID,
		Panel:        "{}",
		SearchEngine: "{}",
	}
	return db.Where(data.UserConfig{UserID: userID}).FirstOrCreate(&config).Error
}
