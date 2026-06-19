# JSON 文件存储 + 单管理员改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 homelab-panel 后端从 SQLite/GORM/多用户改造为单管理员密码 + 单个 JSON 文件 + 默认公开访问；前端保留全部既有能力，适配 `GET/PUT /panel` 单一文档契约。

**Architecture:** 后端单二进制（Gin），状态落在一个 JSON 文件（`data/homelab-panel.json`），管理员 token 仅存内存；面板是一个整体文档，前端 panel store 持有完整文档，所有编辑动作改为"改 store + 显式 `PUT /panel`"。响应契约为裸 JSON + HTTP 状态码（错误 `{"error":...}`），前端 `apiResult.ts` 天然兼容。

**Tech Stack:** Go 1.26 / gin / urfave-cli / zap / golang.org/x/crypto（bcrypt）；React 19 / MUI / Zustand / React Router / axios / vitest。

**Spec:** `docs/superpowers/specs/2026-06-14-json-store-single-admin-refactor-design.md`

**Branch:** `refactor/json-store-single-admin`（已创建）

---

## File Structure

### 后端

**Create:**
- `internal/data/store.go` — `Store`：Open（首次生成密码）/ Snapshot / Save（原子写）/ CheckPassword / UpdatePassword
- `internal/data/store_test.go` — Store 单测
- `internal/handlers/tokens.go` — `TokenManager`（内存 token）
- `internal/handlers/tokens_test.go` — TokenManager 单测
- `internal/handlers/panel.go` — `GetPanel` / `UpdatePanel` + `normalizePanel` 校验/补齐
- `internal/handlers/panel_test.go` — normalize 与 handler 单测

**Rewrite（覆盖原内容）:**
- `internal/data/models.go` — 纯 JSON 结构（去 GORM）
- `internal/handlers/handlers.go` — `Deps`/`Handler`/`NewHandler`（Store 代替 DB，内含 tokens）
- `internal/handlers/middleware.go` — `RequireAdmin`（Bearer token）
- `internal/handlers/response.go` — `writeError`/`writeJSON`
- `internal/handlers/auth.go` — `CreateAdminSession`/`DeleteAdminSession`/`UpdateAdminPassword`
- `internal/handlers/files.go` — `UploadFiles`/`ListFiles`/`DeleteFile`/`Upload`（基于 Store）
- `internal/handlers/public.go` — `Health`/`About`（删 PublicHome）
- `internal/app/app.go` — Open store + 打印密码（无 DB）
- `internal/app/server.go` — `ServerDeps.Store`
- `internal/app/router.go` — 新路由表
- `cmd/homelab-panel/main.go` — 删 password-reset 命令

**Delete:**
- `internal/data/db.go`
- `internal/handlers/users.go`, `groups.go`, `items.go`, `settings.go`, `user_config.go`
- `docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`
- `data/data.db`（运行时产物）
- `internal/handlers/static.go` 保留不变（已无需改动）

### 前端

**Create:**
- `web/src/api/panel.ts` — `getPanel`/`savePanel`
- `web/src/api/admin.ts` — `login`/`logout`/`changePassword`
- `web/src/api/files.ts` — `uploadImg`/`uploadFiles`/`getList`/`deletes`（合并自 `system/file.ts`）
- `web/src/store/panel.test.ts` — store mutator 单测

**Rewrite:**
- `web/src/api/adapters.ts` — 面板文档 ↔ 前端类型（删 user/setting/file/public 适配）
- `web/src/store/panel.ts` — 持有完整文档 + `load` + 各 mutator（显式 persist）
- `web/src/store/auth.ts` — `{token, isAdmin, initialized}`，去 userInfo/visitMode
- `web/src/components/common/AuthBootstrap.tsx` — 不再强制跳登录
- `web/src/pages/Login.tsx` — 仅密码
- `web/src/pages/Home.tsx` — `canManage` 改用 `isAdmin`
- `web/src/pages/home/useHomeData.ts` — `loadList` 走 `getPanel` + 装配
- `web/src/pages/home/useHomeActions.ts` — 删除动作走 store
- `web/src/pages/home/useHomeSort.ts` — 排序走 store
- `web/src/pages/home/HomeFloatingActions.tsx` — 用 `isAdmin` 代替 visitMode
- `web/src/components/apps/GroupManager.tsx` — 读/写 store
- `web/src/components/common/EditItemDialog.tsx` — 走 store
- `web/src/components/common/BatchAddItemsDialog.tsx` — 走 store
- `web/src/components/apps/StylePanel.tsx` — 走 store
- `web/src/components/apps/ImportExportPanel.tsx` — 从 store 导出、经 store 导入
- `web/src/components/apps/AppStarter.tsx` — 移除 UsersPanel/UserInfoPanel
- `web/src/features/files/FileManagerPanel.tsx` — 改 import 路径
- `web/src/types/user.ts`, `web/src/types/login.ts`, `web/src/constants/auth.ts` — 精简

**Delete:**
- `web/src/api/auth.ts`, `user.ts`, `public.ts`
- `web/src/api/panel/users.ts`, `userConfig.ts`, `itemIcon.ts`, `itemIconGroup.ts`, `backup.ts`
- `web/src/api/system/moduleConfig.ts`, `system/file.ts`
- `web/src/components/apps/UsersPanel.tsx`, `UserInfoPanel.tsx`

---

## Task 1: 后端数据模型（纯 JSON 结构）

**Files:**
- Rewrite: `internal/data/models.go`
- Delete (后续 Task 13): `internal/data/db.go`（本任务暂不删，避免编译断裂）

- [ ] **Step 1: 重写 `internal/data/models.go`**

覆盖整个文件为（Go 代码使用 Tab 缩进）：

```go
package data

import (
	"encoding/json"
	"time"
)

type StoreData struct {
	Version   int       `json:"version"`
	Admin     Admin     `json:"admin"`
	Panel     Panel     `json:"panel"`
	Files     []File    `json:"files"`
	NextID    NextID    `json:"nextId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Admin struct {
	PasswordHash string    `json:"passwordHash"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type Panel struct {
	SiteName     string          `json:"siteName"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"searchEngine"`
	Groups       []Group         `json:"groups"`
	Items        []Item          `json:"items"`
}

type Group struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon,omitempty"`
	Sort      int       `json:"sort"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"groupId"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	LANURL      string    `json:"lanUrl,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	OpenMethod  string    `json:"openMethod"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ItemIcon struct {
	ItemType        int    `json:"itemType"`
	Src             string `json:"src,omitempty"`
	Text            string `json:"text,omitempty"`
	BackgroundColor string `json:"backgroundColor,omitempty"`
}

type File struct {
	ID           int       `json:"id"`
	OriginalName string    `json:"originalName"`
	ObjectKey    string    `json:"objectKey"`
	MimeType     string    `json:"mimeType"`
	Size         int64     `json:"size"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"createdAt"`
}

type NextID struct {
	Group int `json:"group"`
	Item  int `json:"item"`
	File  int `json:"file"`
}
```

- [ ] **Step 2: 删除 `internal/data/db.go`（引用旧 GORM 模型，必须同步移除才能编译 data 包）**

Run: `git rm internal/data/db.go`
Expected: 文件已暂存删除。

- [ ] **Step 3: 确认 `data` 包单独可编译**

Run: `go build ./internal/data/`
Expected: 成功（无输出）。`data` 包现在只含 `models.go`（无 GORM 依赖）。

> 注：此时 `go build ./...` 仍失败，因为 `internal/handlers` 的旧文件引用已删的 `data.User` 等类型与 gorm——这是预期，将在 Task 7 删除旧 handler 后解决。本任务只保证 `data` 包可独立编译/测试。

- [ ] **Step 4: 暂不提交（Task 2 一并提交 models.go + store.go + store_test.go + db.go 删除）**

---

## Task 2: Store — Open / Snapshot / Save / 密码

**Files:**
- Create: `internal/data/store.go`
- Create: `internal/data/store_test.go`

- [ ] **Step 1: 先写失败测试 `internal/data/store_test.go`**

```go
package data

import (
	"path/filepath"
	"testing"

	"go.uber.org/zap"
)

func newTestLogger(t *testing.T) *zap.Logger {
	t.Helper()
	logger, err := zap.NewDevelopment()
	if err != nil {
		t.Fatalf("create logger: %v", err)
	}
	return logger
}

func TestOpenFirstRunCreatesFileAndPassword(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "homelab-panel.json")

	store, password, err := Open(path, newTestLogger(t))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if password == "" {
		t.Fatal("expected first-run password, got empty")
	}
	if !store.CheckPassword(password) {
		t.Fatal("first-run password should verify")
	}
	if store.CheckPassword("wrong") {
		t.Fatal("wrong password should not verify")
	}

	again, pw2, err := Open(path, newTestLogger(t))
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if pw2 != "" {
		t.Fatalf("reopen should not return a password, got %q", pw2)
	}
	if !again.CheckPassword(password) {
		t.Fatal("persisted password should still verify after reopen")
	}
}

func TestSaveAtomicAndVisible(t *testing.T) {
	dir := t.TempDir()
	store, _, err := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))
	if err != nil {
		t.Fatalf("open: %v", err)
	}

	err = store.Save(func(d *StoreData) error {
		d.Panel.SiteName = "My Lab"
		d.Panel.Groups = append(d.Panel.Groups, Group{Name: "g1"})
		return nil
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}

	snap := store.Snapshot()
	if snap.Panel.SiteName != "My Lab" {
		t.Fatalf("siteName = %q", snap.Panel.SiteName)
	}
	if len(snap.Panel.Groups) != 1 {
		t.Fatalf("groups = %d", len(snap.Panel.Groups))
	}

	reopened, _, _ := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))
	if reopened.Snapshot().Panel.SiteName != "My Lab" {
		t.Fatal("save should be persisted to disk")
	}
}

func TestSaveRollbackOnError(t *testing.T) {
	dir := t.TempDir()
	store, _, _ := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))

	err := store.Save(func(d *StoreData) error {
		d.Panel.SiteName = "should not persist"
		return assertErr
	})
	if err != assertErr {
		t.Fatalf("expected assertErr, got %v", err)
	}
	if store.Snapshot().Panel.SiteName == "should not persist" {
		t.Fatal("failed Save must not mutate in-memory state")
	}
}

func TestUpdatePassword(t *testing.T) {
	dir := t.TempDir()
	store, initial, _ := Open(filepath.Join(dir, "homelab-panel.json"), newTestLogger(t))

	if err := store.UpdatePassword("wrong", "newpass"); err != ErrInvalidPassword {
		t.Fatalf("expected ErrInvalidPassword, got %v", err)
	}
	if err := store.UpdatePassword(initial, "newpass"); err != nil {
		t.Fatalf("update: %v", err)
	}
	if !store.CheckPassword("newpass") {
		t.Fatal("new password should verify")
	}
}

var assertErr = errSentinel("sentinel")

type errSentinel string

func (e errSentinel) Error() string { return string(e) }
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `go test ./internal/data/`
Expected: FAIL（`Open`、`Save`、`CheckPassword`、`UpdatePassword`、`ErrInvalidPassword` 未定义）

- [ ] **Step 3: 实现 `internal/data/store.go`**

```go
package data

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

const dataVersion = 1

var ErrInvalidPassword = errors.New("invalid password")

type Store struct {
	mu     sync.RWMutex
	path   string
	data   StoreData
	logger *zap.Logger
}

func Open(path string, logger *zap.Logger) (*Store, string, error) {
	s := &Store{path: path, logger: logger}

	raw, err := os.ReadFile(path)
	switch {
	case err == nil:
		if err := json.Unmarshal(raw, &s.data); err != nil {
			return nil, "", fmt.Errorf("parse store file: %w", err)
		}
		if s.data.Files == nil {
			s.data.Files = []File{}
		}
		return s, "", nil
	case errors.Is(err, os.ErrNotExist):
		password, err := s.init()
		if err != nil {
			return nil, "", err
		}
		return s, password, nil
	default:
		return nil, "", fmt.Errorf("read store file: %w", err)
	}
}

func (s *Store) init() (string, error) {
	password, err := generatePassword()
	if err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	now := time.Now()
	s.data = StoreData{
		Version: dataVersion,
		Admin: Admin{
			PasswordHash: string(hash),
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		Panel: Panel{
			SiteName:     "Homelab Panel",
			Config:       json.RawMessage("{}"),
			SearchEngine: json.RawMessage("{}"),
			Groups:       []Group{},
			Items:        []Item{},
		},
		Files:     []File{},
		NextID:    NextID{Group: 1, Item: 1, File: 1},
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.persist(); err != nil {
		return "", err
	}
	return password, nil
}

func (s *Store) persist() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return fmt.Errorf("create data dir: %w", err)
	}
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal store: %w", err)
	}
	dir := filepath.Dir(s.path)
	tmp, err := os.CreateTemp(dir, ".homelab-panel-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpName := tmp.Name()
	if _, err := tmp.Write(raw); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Chmod(tmpName, 0o600); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("chmod temp file: %w", err)
	}
	if err := os.Rename(tmpName, s.path); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("rename store file: %w", err)
	}
	return nil
}

func (s *Store) Snapshot() StoreData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return deepCopy(s.data)
}

func (s *Store) Save(fn func(*StoreData) error) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	next := deepCopy(s.data)
	if err := fn(&next); err != nil {
		return err
	}
	next.UpdatedAt = time.Now()
	previous := s.data
	s.data = next
	if err := s.persist(); err != nil {
		s.data = previous
		return err
	}
	return nil
}

func (s *Store) CheckPassword(password string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return bcrypt.CompareHashAndPassword([]byte(s.data.Admin.PasswordHash), []byte(password)) == nil
}

func (s *Store) UpdatePassword(oldPassword, newPassword string) error {
	if !s.CheckPassword(oldPassword) {
		return ErrInvalidPassword
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}
	return s.Save(func(d *StoreData) error {
		d.Admin.PasswordHash = string(hash)
		d.Admin.UpdatedAt = time.Now()
		return nil
	})
}

func deepCopy(d StoreData) StoreData {
	raw, err := json.Marshal(d)
	if err != nil {
		return d
	}
	var copy StoreData
	_ = json.Unmarshal(raw, &copy)
	return copy
}

func generatePassword() (string, error) {
	var buf [12]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", fmt.Errorf("read random: %w", err)
	}
	return hex.EncodeToString(buf[:]), nil
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `go test ./internal/data/`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add internal/data
git commit -m "feat(data): 引入 JSON 文件 Store 与纯 JSON 模型，移除 db.go"
```

---

## Task 3: TokenManager（内存 token）

**Files:**
- Create: `internal/handlers/tokens.go`
- Create: `internal/handlers/tokens_test.go`

- [ ] **Step 1: 先写失败测试 `internal/handlers/tokens_test.go`**

```go
package handlers

import (
	"testing"
	"time"
)

func TestTokenIssueValidRevoke(t *testing.T) {
	m := NewTokenManager(time.Hour)

	token, _, err := m.Issue()
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if token == "" || !m.Valid(token) {
		t.Fatal("issued token should be valid")
	}
	m.Revoke(token)
	if m.Valid(token) {
		t.Fatal("revoked token should be invalid")
	}
}

func TestTokenExpiredInvalid(t *testing.T) {
	m := NewTokenManager(10 * time.Millisecond)
	token, _, _ := m.Issue()
	time.Sleep(20 * time.Millisecond)
	if m.Valid(token) {
		t.Fatal("expired token should be invalid")
	}
}

func TestTokenEmptyInvalid(t *testing.T) {
	m := NewTokenManager(time.Hour)
	if m.Valid("") {
		t.Fatal("empty token should be invalid")
	}
}
```

- [ ] **Step 2: 测试运行延后**

> 说明：`internal/handlers` 包当前多个旧文件（users.go/groups.go/items.go/settings.go/user_config.go）仍引用 gorm 与已删除的 `data.User` 等类型，整个包无法编译。因此 tokens 的测试要等到 Task 7 删除这些旧文件后才能运行。本任务只完成 `tokens.go` + `tokens_test.go` 的编写与逻辑自检；统一 `go test ./internal/handlers/ -run Token` 在 Task 7 执行。

- [ ] **Step 3: 实现 `internal/handlers/tokens.go`**

```go
package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type TokenManager struct {
	mu     sync.Mutex
	tokens map[string]time.Time
	ttl    time.Duration
}

func NewTokenManager(ttl time.Duration) *TokenManager {
	return &TokenManager{tokens: make(map[string]time.Time), ttl: ttl}
}

func (m *TokenManager) Issue() (string, time.Time, error) {
	var buf [32]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", time.Time{}, err
	}
	token := hex.EncodeToString(buf[:])
	expires := time.Now().Add(m.ttl)
	m.mu.Lock()
	m.tokens[token] = expires
	m.mu.Unlock()
	return token, expires, nil
}

func (m *TokenManager) Valid(token string) bool {
	if token == "" {
		return false
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	exp, ok := m.tokens[token]
	if !ok {
		return false
	}
	if time.Now().After(exp) {
		delete(m.tokens, token)
		return false
	}
	return true
}

func (m *TokenManager) Revoke(token string) {
	m.mu.Lock()
	delete(m.tokens, token)
	m.mu.Unlock()
}
```

- [ ] **Step 4: 暂不提交（与 Task 4-7 一并在 Task 7 末尾提交，保证 handlers 包可编译）**

---

## Task 4: response / handlers / middleware

**Files:**
- Rewrite: `internal/handlers/response.go`
- Rewrite: `internal/handlers/handlers.go`
- Rewrite: `internal/handlers/middleware.go`

- [ ] **Step 1: 重写 `internal/handlers/response.go`**

```go
package handlers

import "github.com/gin-gonic/gin"

func writeError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func writeJSON(c *gin.Context, status int, value any) {
	c.JSON(status, value)
}
```

- [ ] **Step 2: 重写 `internal/handlers/handlers.go`**

```go
package handlers

import (
	"io/fs"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Deps struct {
	Store   *data.Store
	Logger  *zap.Logger
	DataDir string
	Version string
	WebFS   fs.FS
}

type Handler struct {
	Store   *data.Store
	Logger  *zap.Logger
	DataDir string
	Version string
	WebFS   fs.FS
	tokens  *TokenManager
}

func NewHandler(deps Deps) *Handler {
	return &Handler{
		Store:   deps.Store,
		Logger:  deps.Logger,
		DataDir: deps.DataDir,
		Version: deps.Version,
		WebFS:   deps.WebFS,
		tokens:  NewTokenManager(7 * 24 * time.Hour),
	}
}
```

- [ ] **Step 3: 重写 `internal/handlers/middleware.go`**

```go
package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const adminTokenKey = "adminToken"

func (h *Handler) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if !h.tokens.Valid(token) {
			writeError(c, http.StatusUnauthorized, "invalid or missing admin token")
			c.Abort()
			return
		}
		c.Set(adminTokenKey, token)
		c.Next()
	}
}

func currentAdminToken(c *gin.Context) string {
	if v, ok := c.Get(adminTokenKey); ok {
		if t, ok := v.(string); ok {
			return t
		}
	}
	return ""
}

func bearerToken(header string) string {
	kind, token, ok := strings.Cut(header, " ")
	if !ok || !strings.EqualFold(kind, "Bearer") {
		return ""
	}
	return strings.TrimSpace(token)
}
```

- [ ] **Step 4: 暂不提交（包仍未编译通过，待 auth/panel/files/public 重写后统一）**

---

## Task 5: auth handler（管理员会话/改密）

**Files:**
- Rewrite: `internal/handlers/auth.go`

- [ ] **Step 1: 重写 `internal/handlers/auth.go`**

```go
package handlers

import (
	"errors"
	"net/http"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

type sessionRequest struct {
	Password string `json:"password"`
}

type passwordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

func (h *Handler) CreateAdminSession(c *gin.Context) {
	var req sessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if !h.Store.CheckPassword(req.Password) {
		writeError(c, http.StatusUnauthorized, "invalid password")
		return
	}
	token, expires, err := h.tokens.Issue()
	if err != nil {
		writeError(c, http.StatusInternalServerError, "create session failed")
		return
	}
	writeJSON(c, http.StatusCreated, gin.H{"token": token, "expiresAt": expires})
}

func (h *Handler) DeleteAdminSession(c *gin.Context) {
	h.tokens.Revoke(currentAdminToken(c))
	c.Status(http.StatusNoContent)
}

func (h *Handler) UpdateAdminPassword(c *gin.Context) {
	var req passwordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.NewPassword == "" {
		writeError(c, http.StatusBadRequest, "newPassword is required")
		return
	}
	if len(req.NewPassword) < 6 {
		writeError(c, http.StatusBadRequest, "newPassword must be at least 6 characters")
		return
	}
	err := h.Store.UpdatePassword(req.OldPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, data.ErrInvalidPassword) {
			writeError(c, http.StatusUnauthorized, "old password is incorrect")
			return
		}
		writeError(c, http.StatusInternalServerError, "update password failed")
		return
	}
	writeJSON(c, http.StatusOK, gin.H{"ok": true})
}
```

- [ ] **Step 2: 暂不提交（待 panel/files/public 重写后统一编译）**

---

## Task 6: panel handler + normalize

**Files:**
- Create: `internal/handlers/panel.go`
- Create: `internal/handlers/panel_test.go`

- [ ] **Step 1: 先写失败测试 `internal/handlers/panel_test.go`**

```go
package handlers

import (
	"encoding/json"
	"path/filepath"
	"testing"

	"homelab-panel/internal/data"

	"go.uber.org/zap"
)

func mustStore(t *testing.T) *data.Store {
	t.Helper()
	logger, _ := zap.NewDevelopment()
	s, _, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"), logger)
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	return s
}

func TestNormalizeAssignsIDsAndPreservesCreatedAt(t *testing.T) {
	store := mustStore(t)
	// 预置一个已存在分组
	store.Save(func(d *data.StoreData) error {
		d.Panel.Groups = append(d.Panel.Groups, data.Group{ID: 1, Name: "g1"})
		return nil
	})
	snap := store.Snapshot()

	req := panelRequest{
		SiteName: "Lab",
		Config:   json.RawMessage(`{"logoText":"x"}`),
		Groups: []groupInput{
			{ID: 1, Name: "g1"},           // 已存在，保留
			{Name: "g2"},                  // 新增
		},
		Items: []itemInput{
			{GroupID: 1, Title: "i1", URL: "https://a", OpenMethod: "new_tab"},
			{GroupID: 2, Title: "i2", URL: "https://b", OpenMethod: "new_tab"},
		},
	}

	out, err := normalizePanel(req, snap, store.Snapshot().NextID)
	if err != nil {
		t.Fatalf("normalize: %v", err)
	}
	if len(out.Groups) != 2 || out.Groups[0].ID != 1 || out.Groups[1].ID == 0 {
		t.Fatalf("groups = %+v", out.Groups)
	}
	if len(out.Items) != 2 || out.Items[0].ID == 0 {
		t.Fatalf("items = %+v", out.Items)
	}
	if out.Groups[0].CreatedAt.IsZero() {
		t.Fatal("existing group createdAt should be preserved")
	}
}

func TestNormalizeRejectsDanglingGroupRef(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()
	req := panelRequest{
		Groups: []groupInput{{Name: "g1"}},
		Items:  []itemInput{{GroupID: 999, Title: "i1", URL: "https://a", OpenMethod: "new_tab"}},
	}
	_, err := normalizePanel(req, snap, snap.NextID)
	if err != errItemGroupDangling {
		t.Fatalf("expected errItemGroupDangling, got %v", err)
	}
}

func TestNormalizeRejectsMissingName(t *testing.T) {
	store := mustStore(t)
	snap := store.Snapshot()
	req := panelRequest{Groups: []groupInput{{Name: ""}}}
	if _, err := normalizePanel(req, snap, snap.NextID); err != errGroupNameRequired {
		t.Fatalf("expected errGroupNameRequired, got %v", err)
	}
}
```

- [ ] **Step 2: 测试运行延后**

> 说明：`internal/handlers` 包在 Task 7 删除旧 handler 之前无法编译（旧文件引用已删类型与 gorm），因此 normalize 的"先失败再通过"循环无法在此执行。本任务先写测试 + 实现，统一在 Task 7 Step 5 运行 `go test ./internal/handlers/` 验证。

- [ ] **Step 3: 实现 `internal/handlers/panel.go`**

```go
package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
)

type panelRequest struct {
	SiteName     string          `json:"siteName"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"searchEngine"`
	Groups       []groupInput    `json:"groups"`
	Items        []itemInput     `json:"items"`
}

type groupInput struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
	Sort int    `json:"sort"`
}

type itemInput struct {
	ID          int            `json:"id"`
	GroupID     int            `json:"groupId"`
	Title       string         `json:"title"`
	URL         string         `json:"url"`
	LANURL      string         `json:"lanUrl"`
	Description string         `json:"description"`
	Icon        *data.ItemIcon `json:"icon"`
	OpenMethod  string         `json:"openMethod"`
	Sort        int            `json:"sort"`
}

var validOpenMethods = map[string]bool{"current": true, "new_tab": true, "iframe": true}

var (
	errGroupNameRequired = errors.New("group name is required")
	errItemTitleRequired = errors.New("item title is required")
	errItemURLRequired   = errors.New("item url is required")
	errItemGroupDangling = errors.New("item references unknown group")
	errOpenMethodInvalid = errors.New("invalid openMethod")
)

func (h *Handler) GetPanel(c *gin.Context) {
	snap := h.Store.Snapshot()
	writeJSON(c, http.StatusOK, panelView(snap.Panel))
}

func (h *Handler) UpdatePanel(c *gin.Context) {
	var req panelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeError(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Config) == 0 {
		req.Config = json.RawMessage("{}")
	}
	if len(req.SearchEngine) == 0 {
		req.SearchEngine = json.RawMessage("{}")
	}

	snap := h.Store.Snapshot()
	normalized, err := normalizePanel(req, snap, snap.NextID)
	if err != nil {
		if errors.Is(err, errItemGroupDangling) {
			writeError(c, http.StatusConflict, err.Error())
			return
		}
		writeError(c, http.StatusBadRequest, err.Error())
		return
	}

	maxGroup, maxItem := maxExistingIDs(normalized)
	err = h.Store.Save(func(d *data.StoreData) error {
		d.Panel = normalized
		if maxGroup >= d.NextID.Group {
			d.NextID.Group = maxGroup + 1
		}
		if maxItem >= d.NextID.Item {
			d.NextID.Item = maxItem + 1
		}
		return nil
	})
	if err != nil {
		writeError(c, http.StatusInternalServerError, "save panel failed")
		return
	}
	writeJSON(c, http.StatusOK, panelView(normalized))
}

func normalizePanel(req panelRequest, snap data.StoreData, nextID data.NextID) (data.Panel, error) {
	now := time.Now()

	existingGroupByID := make(map[int]data.Group, len(snap.Panel.Groups))
	for _, g := range snap.Panel.Groups {
		existingGroupByID[g.ID] = g
	}
	existingItemByID := make(map[int]data.Item, len(snap.Panel.Items))
	for _, it := range snap.Panel.Items {
		existingItemByID[it.ID] = it
	}

	groups := make([]data.Group, 0, len(req.Groups))
	groupIDSet := make(map[int]bool, len(req.Groups))
	nextGroupID := nextID.Group
	for idx, g := range req.Groups {
		if g.Name == "" {
			return data.Panel{}, errGroupNameRequired
		}
		id := g.ID
		created := now
		if prev, ok := existingGroupByID[id]; ok && id != 0 {
			created = prev.CreatedAt
		} else {
			id = nextGroupID
			nextGroupID++
		}
		groupIDSet[id] = true
		sort := g.Sort
		if sort == 0 {
			sort = idx + 1
		}
		groups = append(groups, data.Group{
			ID:        id,
			Name:      g.Name,
			Icon:      g.Icon,
			Sort:      sort,
			CreatedAt: created,
			UpdatedAt: now,
		})
	}

	items := make([]data.Item, 0, len(req.Items))
	nextItemID := nextID.Item
	for idx, it := range req.Items {
		if it.Title == "" {
			return data.Panel{}, errItemTitleRequired
		}
		if it.URL == "" {
			return data.Panel{}, errItemURLRequired
		}
		if it.OpenMethod != "" && !validOpenMethods[it.OpenMethod] {
			return data.Panel{}, errOpenMethodInvalid
		}
		openMethod := it.OpenMethod
		if openMethod == "" {
			openMethod = "new_tab"
		}
		if !groupIDSet[it.GroupID] {
			return data.Panel{}, errItemGroupDangling
		}
		id := it.ID
		created := now
		if prev, ok := existingItemByID[id]; ok && id != 0 {
			created = prev.CreatedAt
		} else {
			id = nextItemID
			nextItemID++
		}
		sort := it.Sort
		if sort == 0 {
			sort = idx + 1
		}
		items = append(items, data.Item{
			ID:          id,
			GroupID:     it.GroupID,
			Title:       it.Title,
			URL:         it.URL,
			LANURL:      it.LANURL,
			Description: it.Description,
			Icon:        it.Icon,
			OpenMethod:  openMethod,
			Sort:        sort,
			CreatedAt:   created,
			UpdatedAt:   now,
		})
	}

	return data.Panel{
		SiteName:     req.SiteName,
		Config:       req.Config,
		SearchEngine: req.SearchEngine,
		Groups:       groups,
		Items:        items,
	}, nil
}

func maxExistingIDs(p data.Panel) (int, int) {
	maxGroup, maxItem := 0, 0
	for _, g := range p.Groups {
		if g.ID > maxGroup {
			maxGroup = g.ID
		}
	}
	for _, it := range p.Items {
		if it.ID > maxItem {
			maxItem = it.ID
		}
	}
	return maxGroup, maxItem
}

func panelView(p data.Panel) gin.H {
	config := p.Config
	if len(config) == 0 {
		config = json.RawMessage("{}")
	}
	search := p.SearchEngine
	if len(search) == 0 {
		search = json.RawMessage("{}")
	}
	return gin.H{
		"siteName":     p.SiteName,
		"config":       config,
		"searchEngine": search,
		"groups":       p.Groups,
		"items":        p.Items,
	}
}
```

> 注：测试中 `normalizePanel(req, snap, snap.NextID)` 接受 `nextID` 参数，使新 id 分配可预测且无副作用。`UpdatePanel` 用同一签名。

- [ ] **Step 4: 测试运行延后**

> 说明：`internal/handlers` 包在 Task 7 删除旧 handler 之前无法编译，因此 normalize 测试在 Task 7 Step 4 统一运行。

- [ ] **Step 5: 暂不提交（待 handlers 包整体编译通过后在 Task 7 提交）**

---

## Task 7: files / public / 提交 handlers

**Files:**
- Rewrite: `internal/handlers/files.go`
- Rewrite: `internal/handlers/public.go`

- [ ] **Step 1: 重写 `internal/handlers/files.go`**

```go
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
```

- [ ] **Step 2: 在 `files.go` 顶部补充 `time` 导入**

把 `import` 块的 `"homelab-panel/internal/data"` 之上加入 `"time"`（与其它导入一起）。最终导入段：

```go
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
```

- [ ] **Step 3: 重写 `internal/handlers/public.go`**

```go
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
		"name":    "homelab-panel",
		"version": h.Version,
	})
}
```

- [ ] **Step 4: 删除旧 handler，使 `handlers` 包可编译**

```bash
git rm internal/handlers/users.go internal/handlers/groups.go internal/handlers/items.go internal/handlers/settings.go internal/handlers/user_config.go
```

- [ ] **Step 5: 编译并运行 handlers 包测试**

Run: `go build ./internal/handlers/`
Expected: 成功（无输出）

Run: `go test ./internal/handlers/`
Expected: PASS（TokenManager、normalize 全部通过）

- [ ] **Step 6: 提交（handlers 核心）**

```bash
git add internal/handlers
git commit -m "feat(handlers): 重写为 Store 驱动的管理员/面板/文件接口，移除多用户旧 handler"
```

---

## Task 8: 后端 app 层接线

**Files:**
- Rewrite: `internal/app/server.go`
- Rewrite: `internal/app/app.go`
- Rewrite: `internal/app/router.go`
- Rewrite: `cmd/homelab-panel/main.go`

- [ ] **Step 1: 重写 `internal/app/server.go`**

```go
package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type ServerDeps struct {
	Config Config
	Logger *zap.Logger
	Store  *data.Store
}

type Server struct {
	config Config
	logger *zap.Logger
	store  *data.Store
	router *gin.Engine
}

func NewServer(deps ServerDeps) *Server {
	router := gin.New()
	router.Use(gin.Recovery())

	server := &Server{
		config: deps.Config,
		logger: deps.Logger,
		store:  deps.Store,
		router: router,
	}
	server.registerRoutes()

	return server
}

func (s *Server) Run(ctx context.Context) error {
	httpServer := &http.Server{
		Addr:    s.config.address(),
		Handler: s.router,
	}

	errCh := make(chan error, 1)
	go func() {
		s.logger.Info("starting server", zap.String("addr", httpServer.Addr))
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	select {
	case <-ctx.Done():
		if err := httpServer.Shutdown(context.Background()); err != nil {
			return fmt.Errorf("shutdown server: %w", err)
		}
		return ctx.Err()
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("run server: %w", err)
		}
		return nil
	}
}
```

- [ ] **Step 2: 重写 `internal/app/app.go`**

```go
package app

import (
	"context"
	"fmt"
	"homelab-panel/internal/data"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type App struct {
	config   Config
	logger   *zap.Logger
	server   *Server
	password string
}

func New(config Config) (*App, error) {
	gin.SetMode(gin.ReleaseMode)

	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("create logger: %w", err)
	}

	dataDir := config.dataDir()
	if err := os.MkdirAll(filepath.Join(dataDir, "uploads"), 0o755); err != nil {
		return nil, fmt.Errorf("create data directories: %w", err)
	}

	store, password, err := data.Open(filepath.Join(dataDir, "homelab-panel.json"), logger)
	if err != nil {
		return nil, err
	}
	if password != "" {
		fmt.Println("========================================")
		fmt.Println("首次启动：已生成管理员密码（仅显示一次）")
		fmt.Printf("密码：%s\n", password)
		fmt.Println("请妥善保存，登录后可在设置中修改。")
		fmt.Println("========================================")
	}

	server := NewServer(ServerDeps{
		Config: config,
		Logger: logger,
		Store:  store,
	})

	return &App{
		config:   config,
		logger:   logger,
		server:   server,
		password: password,
	}, nil
}

func Run(ctx context.Context, config Config) error {
	app, err := New(config)
	if err != nil {
		return err
	}
	defer func() {
		_ = app.logger.Sync()
	}()

	return app.server.Run(ctx)
}
```

- [ ] **Step 3: 重写 `internal/app/router.go`**

```go
package app

import "homelab-panel/internal/handlers"

func (s *Server) registerRoutes() {
	h := handlers.NewHandler(handlers.Deps{
		Store:   s.store,
		Logger:  s.logger,
		DataDir: s.config.dataDir(),
		Version: s.config.Version,
		WebFS:   s.config.WebFS,
	})

	api := s.router.Group("/api/v1")
	api.GET("/health", h.Health)
	api.GET("/about", h.About)

	api.GET("/panel", h.GetPanel)

	api.POST("/admin/session", h.CreateAdminSession)

	protected := api.Group("")
	protected.Use(h.RequireAdmin())
	protected.DELETE("/admin/session", h.DeleteAdminSession)
	protected.PUT("/admin/password", h.UpdateAdminPassword)
	protected.PUT("/panel", h.UpdatePanel)
	protected.POST("/files", h.UploadFiles)
	protected.GET("/files", h.ListFiles)
	protected.DELETE("/files/:id", h.DeleteFile)

	s.router.GET("/uploads/*filepath", h.Upload)
	s.router.NoRoute(h.Static)
}
```

- [ ] **Step 4: 重写 `cmd/homelab-panel/main.go`（删 password-reset 与 swagger 注释）**

```go
package main

import (
	"homelab-panel/internal/app"
	"log"
	"os"

	"github.com/urfave/cli/v2"
)

var version = "dev"

func main() {
	cliApp := &cli.App{
		Name:    "homelab-panel",
		Usage:   "Homelab panel service",
		Version: version,
		Commands: []*cli.Command{
			{
				Name:  "serve",
				Usage: "Start the HTTP service",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "port",
						Aliases: []string{"p"},
						Usage:   "HTTP listen port",
						Value:   "3002",
					},
					&cli.StringFlag{
						Name:    "dir",
						Aliases: []string{"d"},
						Usage:   "Data directory (contains homelab-panel.json and uploads/)",
						Value:   "./data",
					},
				},
				Action: runServe,
			},
			{
				Name:   "version",
				Usage:  "Print build version",
				Action: runVersion,
			},
		},
	}

	if err := cliApp.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}

func runServe(c *cli.Context) error {
	cfg := app.Config{
		Port:    c.String("port"),
		DataDir: c.String("dir"),
		Version: version,
		WebFS:   os.DirFS("web/dist"),
	}
	return app.Run(c.Context, cfg)
}

func runVersion(c *cli.Context) error {
	c.App.Writer.Write([]byte(version + "\n"))
	return nil
}
```

- [ ] **Step 5: 全仓库编译确认（此时 data/handlers/app 均已就位）**

Run: `go build ./...`
Expected: 成功（无输出）。此时 `go.mod` 仍残留未用的 gorm/sqlite/swag/uuid 依赖——`go build` 不受影响，Task 13 的 `go mod tidy` 会清理。

- [ ] **Step 6: 提交 app 层**

```bash
git add internal/app cmd
git commit -m "refactor(app): 接线 Store 驱动的服务，移除 DB 初始化与 password-reset"
```

---

## Task 13: 清理 swagger/旧产物 + go mod tidy

> 注：`internal/data/db.go` 已在 Task 1 删除；`internal/handlers/{users,groups,items,settings,user_config}.go` 已在 Task 7 删除。本任务只清理 swagger 文档、旧数据库文件并整理依赖。

**Files:**
- Delete: `docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml`
- Delete: `data/data.db`（运行时产物）
- Modify: `go.mod`, `go.sum`

- [ ] **Step 1: 删除 swagger 与旧数据库**

```bash
git rm docs/docs.go docs/swagger.json docs/swagger.yaml
rm -f data/data.db
```

- [ ] **Step 2: 整理依赖**

Run: `go mod tidy`
Expected: `go.mod` 移除 `gorm.io/gorm`、`github.com/glebarez/sqlite`、`github.com/swaggo/swag`、`github.com/google/uuid` 及其间接依赖；仅保留 gin/cli/zap/crypto 及其间接依赖。

- [ ] **Step 3: 编译与静态检查（全仓库）**

Run: `go build ./...`
Expected: 成功（无输出）

Run: `go vet ./...`
Expected: 成功（无输出）

- [ ] **Step 4: 运行全部后端测试**

Run: `go test ./...`
Expected: PASS（data、handlers 包测试通过）

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "refactor(后端): 删除 swagger 文档与 SQLite 产物并精简依赖"
```

---

## Task 14: 后端冒烟验证（手工 curl）

**Files:** 无改动

- [ ] **Step 1: 构建并启动（前台，记录首启密码）**

Run: `CGO_ENABLED=0 go build -o homelab-panel ./cmd/homelab-panel && rm -rf data && ./homelab-panel serve`
Expected: 控制台打印首启密码块；监听 `:3002`。记录 `<PWD>`。

- [ ] **Step 2: 公开读取面板**

Run（新终端）: `curl -s http://127.0.0.1:3002/api/v1/panel`
Expected: `{"siteName":"Homelab Panel","config":{},"searchEngine":{},"groups":[],"items":[]}`

- [ ] **Step 3: 登录拿 token**

Run: `curl -s -X POST http://127.0.0.1:3002/api/v1/admin/session -H 'Content-Type: application/json' -d '{"password":"<PWD>"}'`
Expected: `{"token":"<TOKEN>","expiresAt":"..."}`。记录 `<TOKEN>`。

- [ ] **Step 4: 无 token 写面板 → 401**

Run: `curl -s -o /dev/null -w "%{http_code}" -X PUT http://127.0.0.1:3002/api/v1/panel -H 'Content-Type: application/json' -d '{}'`
Expected: `401`

- [ ] **Step 5: 带 token 写面板**

Run: `curl -s -X PUT http://127.0.0.1:3002/api/v1/panel -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' -d '{"siteName":"Lab","config":{"logoText":"Lab"},"searchEngine":{},"groups":[{"name":"g1"}],"items":[{"groupId":1,"title":"a","url":"https://a.com","openMethod":"new_tab"}]}'`
Expected: 200，返回规范化面板（group 带 id，item 带 id，config 透传）。

- [ ] **Step 6: 悬空 groupId → 409**

Run: `curl -s -o /dev/null -w "%{http_code}" -X PUT http://127.0.0.1:3002/api/v1/panel -H 'Authorization: Bearer <TOKEN>' -H 'Content-Type: application/json' -d '{"groups":[],"items":[{"groupId":999,"title":"x","url":"https://x.com","openMethod":"new_tab"}]}'`
Expected: `409`

- [ ] **Step 7: 停服**

在启动终端按 Ctrl-C。

- [ ] **Step 8: 无需提交（仅验证）**

---

## Task 15: 前端 API 层（panel / admin / files）

**Files:**
- Create: `web/src/api/panel.ts`
- Create: `web/src/api/admin.ts`
- Create: `web/src/api/files.ts`

- [ ] **Step 1: 新建 `web/src/api/panel.ts`**

```ts
import { toBackendPanel, toFrontendPanel, type PanelWire } from '@/api/adapters'
import { get, put } from '@/api/request'
import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

export interface PanelDocument {
  siteName: string
  config: PanelConfig
  searchEngine: unknown
  groups: ItemIconGroup[]
  items: ItemInfo[]
}

export function getPanel() {
  return get<PanelWire>({ url: '/panel' }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendPanel(res.data) : (null as unknown as PanelDocument),
  }))
}

export function savePanel(doc: PanelDocument) {
  return put<PanelWire>({ url: '/panel', data: toBackendPanel(doc) }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendPanel(res.data) : (null as unknown as PanelDocument),
  }))
}
```

- [ ] **Step 2: 新建 `web/src/api/admin.ts`**

```ts
import { del, post, put } from '@/api/request'

export function login(password: string) {
  return post<{ token: string, expiresAt?: string }>({ url: '/admin/session', data: { password } })
}

export function logout() {
  return del<void>({ url: '/admin/session' })
}

export function changePassword(oldPassword: string, newPassword: string) {
  return put<{ ok: boolean }>({ url: '/admin/password', data: { oldPassword, newPassword } })
}
```

- [ ] **Step 3: 新建 `web/src/api/files.ts`（合并自 `system/file.ts`）**

```ts
import { del, get, post } from '@/api/request'
import type { FileInfo, UploadFilesResponse, UploadImgResponse } from '@/types/panel'

interface BackendFile {
  id?: number
  originalName?: string
  objectKey?: string
  url?: string
  createdAt?: string
}

function toFrontendFile(f: BackendFile): FileInfo {
  return {
    id: f.id ?? 0,
    src: f.url ?? '',
    path: f.url ?? '',
    fileName: f.originalName ?? f.objectKey ?? f.url ?? '',
    createTime: f.createdAt,
    updateTime: f.createdAt,
  }
}

export function uploadImg(file: File) {
  const data = new FormData()
  data.append('imgfile', file)
  data.append('file', file)
  return post<BackendFile[]>({ url: '/files', data }).then((res) => {
    const uploaded = res.code === 0 ? res.data.map(toFrontendFile) : []
    return {
      ...res,
      data: res.code === 0
        ? { imageUrl: uploaded[0]?.src ?? '' }
        : (null as unknown as UploadImgResponse),
    }
  })
}

export function uploadFiles(files: File[]) {
  const data = new FormData()
  files.forEach(file => data.append('files[]', file))
  return post<BackendFile[]>({ url: '/files', data }).then((res) => {
    const uploaded = res.code === 0 ? res.data.map(toFrontendFile) : []
    return {
      ...res,
      data: res.code === 0
        ? {
            succMap: Object.fromEntries(uploaded.map(file => [file.fileName, file.src])),
            errFiles: [],
          }
        : (null as unknown as UploadFilesResponse),
    }
  })
}

export function getList() {
  return get<BackendFile[]>({ url: '/files' }).then(res => ({
    ...res,
    data: res.code === 0 ? { list: res.data.map(toFrontendFile), count: res.data.length } : { list: [], count: 0 },
  }))
}

export async function deletes(ids: number[]) {
  for (const id of ids) {
    const res = await del<void>({ url: `/files/${id}` })
    if (res.code !== 0)
      return res
  }
  return { code: 0, msg: 'OK', data: undefined }
}
```

> 注：`getList` 返回固定 `{list, count}` 结构，省去 `listResponse` 依赖。

- [ ] **Step 4: 暂不提交（adapters 重写后一并 type-check）**

---

## Task 16: 重写 adapters.ts

**Files:**
- Rewrite: `web/src/api/adapters.ts`

- [ ] **Step 1: 覆盖 `web/src/api/adapters.ts`**

```ts
import type { ItemIcon, ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

export interface PanelWire {
  siteName: string
  config: PanelConfig
  searchEngine: unknown
  groups: PanelGroupWire[]
  items: PanelItemWire[]
}

export interface PanelGroupWire {
  id?: number
  name: string
  icon?: string
  sort?: number
}

export interface PanelItemWire {
  id?: number
  groupId: number
  title: string
  url: string
  lanUrl?: string
  description?: string
  icon: ItemIcon | null
  openMethod: string
  sort?: number
}

export function toFrontendGroup(w: PanelGroupWire): ItemIconGroup {
  return {
    id: w.id,
    icon: w.icon,
    title: w.name ?? '',
    sort: w.sort,
  }
}

export function toBackendGroup(g: ItemIconGroup): PanelGroupWire {
  return { id: g.id, name: g.title ?? '', icon: g.icon ?? '', sort: g.sort }
}

export function toFrontendItem(w: PanelItemWire): ItemInfo {
  return {
    id: w.id,
    icon: w.icon ?? null,
    title: w.title ?? '',
    url: w.url ?? '',
    lanUrl: w.lanUrl ?? '',
    description: w.description ?? '',
    openMethod: toFrontendOpenMethod(w.openMethod),
    sort: w.sort,
    itemIconGroupId: w.groupId,
  }
}

export function toBackendItem(it: ItemInfo): PanelItemWire {
  return {
    id: it.id,
    groupId: it.itemIconGroupId ?? 0,
    title: it.title,
    url: it.url,
    lanUrl: it.lanUrl ?? '',
    description: it.description ?? '',
    icon: it.icon ?? null,
    openMethod: toBackendOpenMethod(it.openMethod),
    sort: it.sort,
  }
}

export function toFrontendOpenMethod(value?: string): number {
  if (value === 'current')
    return 1
  if (value === 'iframe')
    return 3
  return 2
}

export function toBackendOpenMethod(value?: number): string {
  if (value === 1)
    return 'current'
  if (value === 3)
    return 'iframe'
  return 'new_tab'
}

export interface FrontendPanel {
  siteName: string
  config: PanelConfig
  searchEngine: unknown
  groups: ItemIconGroup[]
  items: ItemInfo[]
}

export function toFrontendPanel(w: PanelWire): FrontendPanel {
  return {
    siteName: w.siteName ?? '',
    config: (w.config ?? {}) as PanelConfig,
    searchEngine: w.searchEngine ?? {},
    groups: (w.groups ?? []).map(toFrontendGroup),
    items: (w.items ?? []).map(toFrontendItem),
  }
}

export function toBackendPanel(doc: FrontendPanel): PanelWire {
  return {
    siteName: doc.siteName,
    config: doc.config,
    searchEngine: doc.searchEngine ?? {},
    groups: doc.groups.map(toBackendGroup),
    items: doc.items.map(toBackendItem),
  }
}
```

- [ ] **Step 2: 暂不提交（store 重写后一并 type-check）**

---

## Task 17: 重写 store/panel.ts（完整文档 + mutator）

**Files:**
- Rewrite: `web/src/store/panel.ts`

- [ ] **Step 1: 覆盖 `web/src/store/panel.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { type ApiResponse, API_SUCCESS_CODE } from '@/api/apiResult'
import { type FrontendPanel, toBackendPanel } from '@/api/adapters'
import { getPanel, savePanel, type PanelDocument } from '@/api/panel'
import background1 from '@/assets/background-1.jpg'
import background2 from '@/assets/background-2.jpg'
import background3 from '@/assets/background-3.jpg'
import background4 from '@/assets/background-4.jpg'
import { PanelPanelConfigStyleEnum, PanelStateNetworkModeEnum } from '@/constants/panel'
import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

const defaultFooterHtml = '<div style="display:flex;justify-content:center;color:#cbd5e1;margin-top:100px">Powered By <a href="https://github.com/lz-wang/homelab-panel" target="_blank" style="margin-left:5px">Homelab Panel</a></div>'

export const builtinBackgrounds = [
  { label: '背景 1', src: background1 },
  { label: '背景 2', src: background2 },
  { label: '背景 3', src: background3 },
  { label: '背景 4', src: background4 },
]

export function defaultPanelConfig(): PanelConfig {
  return {
    backgroundImageSrc: background1,
    backgroundBlur: 0,
    backgroundMaskNumber: 0,
    iconStyle: PanelPanelConfigStyleEnum.icon,
    iconTextColor: '#ffffff',
    iconTextInfoHideDescription: false,
    iconTextIconHideTitle: false,
    logoText: 'Homelab Panel',
    logoImageSrc: '',
    clockShowSecond: false,
    searchBoxShow: false,
    searchBoxSearchIcon: false,
    marginBottom: 10,
    marginTop: 10,
    maxWidth: 1200,
    maxWidthUnit: 'px',
    marginX: 5,
    footerHtml: defaultFooterHtml,
    netModeChangeButtonShow: true,
  }
}

interface PanelStore {
  siteName: string
  panelConfig: PanelConfig
  searchEngine: unknown
  groups: ItemIconGroup[]
  items: ItemInfo[]

  rightSiderCollapsed: boolean
  leftSiderCollapsed: boolean
  networkMode: PanelStateNetworkModeEnum
  panelDataVersion: number

  load: () => Promise<void>
  setNetworkMode: (mode: PanelStateNetworkModeEnum) => void
  setPanelConfig: (config: PanelConfig) => ApiResponse | Promise<ApiResponse>
  resetPanelConfig: () => void

  replaceGroups: (groups: ItemIconGroup[]) => Promise<ApiResponse>
  replaceItems: (items: ItemInfo[]) => Promise<ApiResponse>
  upsertGroup: (group: ItemIconGroup) => Promise<ApiResponse>
  deleteGroups: (ids: number[]) => Promise<ApiResponse>
  upsertItem: (item: ItemInfo) => Promise<ApiResponse>
  deleteItems: (ids: number[]) => Promise<ApiResponse>
  addItems: (items: ItemInfo[]) => Promise<ApiResponse>
  setSiteName: (name: string) => Promise<ApiResponse>
}

function docFromState(s: PanelStore): FrontendPanel {
  return {
    siteName: s.siteName,
    config: s.panelConfig,
    searchEngine: s.searchEngine,
    groups: s.groups,
    items: s.items,
  }
}

export const usePanelStore = create<PanelStore>()(
  persist(
    (set, get) => ({
      siteName: 'Homelab Panel',
      panelConfig: defaultPanelConfig(),
      searchEngine: {},
      groups: [],
      items: [],

      rightSiderCollapsed: false,
      leftSiderCollapsed: false,
      networkMode: PanelStateNetworkModeEnum.wan,
      panelDataVersion: 0,

      load: async () => {
        const res = await getPanel()
        if (res.code === 0 && res.data) {
          set({
            siteName: res.data.siteName,
            panelConfig: { ...defaultPanelConfig(), ...res.data.config },
            searchEngine: res.data.searchEngine,
            groups: res.data.groups,
            items: res.data.items,
            panelDataVersion: get().panelDataVersion + 1,
          })
        }
      },

      setNetworkMode: networkMode => set({ networkMode }),
      setPanelConfig: (panelConfig) => {
        set({ panelConfig: { ...defaultPanelConfig(), ...panelConfig } })
        return persistPanel(get, set, { panelConfig })
      },
      resetPanelConfig: () => set({ panelConfig: defaultPanelConfig() }),

      replaceGroups: groups => persistPanel(get, set, { groups }),
      replaceItems: items => persistPanel(get, set, { items }),

      upsertGroup: (group) => {
        const prior = get().groups
        const exists = Boolean(group.id && prior.some(g => g.id === group.id))
        const groups = exists
          ? prior.map(g => (g.id === group.id ? { ...g, ...group } : g))
          : [...prior, group]
        return persistPanel(get, set, { groups })
      },
      deleteGroups: (ids) => {
        const idSet = new Set(ids)
        const groups = get().groups.filter(g => !g.id || !idSet.has(g.id))
        const items = get().items.filter(it => !it.itemIconGroupId || !idSet.has(it.itemIconGroupId))
        return persistPanel(get, set, { groups, items })
      },

      upsertItem: (item) => {
        const prior = get().items
        const exists = Boolean(item.id && prior.some(it => it.id === item.id))
        const items = exists
          ? prior.map(it => (it.id === item.id ? { ...it, ...item } : it))
          : [...prior, item]
        return persistPanel(get, set, { items })
      },
      deleteItems: (ids) => {
        const idSet = new Set(ids)
        const items = get().items.filter(it => !it.id || !idSet.has(it.id))
        return persistPanel(get, set, { items })
      },
      addItems: (incoming) => {
        const items = [...get().items, ...incoming]
        return persistPanel(get, set, { items })
      },

      setSiteName: name => persistPanel(get, set, { siteName: name }),
    }),
    {
      name: 'panelStorage',
      partialize: state => ({
        rightSiderCollapsed: state.rightSiderCollapsed,
        leftSiderCollapsed: state.leftSiderCollapsed,
        networkMode: state.networkMode,
        panelConfig: state.panelConfig,
      }),
    },
  ),
)

async function persistPanel(
  get: () => PanelStore,
  set: (partial: Partial<PanelStore>) => void,
  optimistic: Partial<PanelStore>,
): Promise<ApiResponse> {
  set(optimistic)
  const res = await savePanel(docFromState({ ...get(), ...optimistic }) as PanelDocument)
  if (res.code === API_SUCCESS_CODE && res.data) {
    set({
      siteName: res.data.siteName,
      groups: res.data.groups,
      items: res.data.items,
      panelDataVersion: get().panelDataVersion + 1,
    })
    return res
  }
  await get().load()
  return res
}
```

> 关键约定：
> - `load()` 走 `GET /panel`，写入文档并 `panelDataVersion++`（Home 据此重建）。
> - 每个 mutator 先乐观写本地、再 `savePanel`（`PUT /panel` 整文档）；成功则用响应回填 groups/items 并 `panelDataVersion++`；失败则 `load()` 回滚并返回错误码，由组件决定如何提示。
> - `setPanelConfig` 同步返回 ApiResponse（样式保存仍可 await，但签名兼容旧调用）；其余 mutator 返回 Promise。
> - persist 只持久化 UI 状态到 localStorage（networkMode、panelConfig、sider），文档不缓存（每次 `load()` 从服务端取，避免脏数据）。

- [ ] **Step 2: 暂不提交（auth/store 与组件改完一并 type-check）**

---

## Task 18: 重写 store/auth.ts

**Files:**
- Rewrite: `web/src/store/auth.ts`

- [ ] **Step 1: 覆盖 `web/src/store/auth.ts`**

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isAdmin: boolean
  initialized: boolean
  setToken: (token: string) => void
  setAdmin: (admin: boolean) => void
  setInitialized: (initialized: boolean) => void
  clearToken: () => void
  bootstrapAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAdmin: false,
      initialized: false,
      setToken: token => set({ token }),
      setAdmin: isAdmin => set({ isAdmin }),
      setInitialized: initialized => set({ initialized }),
      clearToken: () => set({ token: null, isAdmin: false }),
      bootstrapAuth: async () => {
        // 始终公开：面板无需登录即可加载；此处仅置 initialized，
        // token 是否有效在调用受保护接口时按 401 处理（apiResult.handleLoginExpiration 会清 token）。
        set({ initialized: true, isAdmin: Boolean(useAuthStore.getState().token) })
      },
    }),
    {
      name: 'AUTH_TOKEN',
      partialize: state => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setInitialized(false)
      },
    },
  ),
)
```

> 说明：始终公开 → `bootstrapAuth` 不再请求 `/auth/me`，只标记 initialized；`isAdmin` 由"本地是否有 token"初判，真正校验在受保护接口的 401 处理（`apiResult.handleLoginExpiration` 已在收到 401/403 时 `removeToken`；本任务把该方法改为调用 `clearToken`，见 Task 19）。

- [ ] **Step 2: 暂不提交**

---

## Task 19: apiResult 适配新 auth + 删旧 API 文件

**Files:**
- Modify: `web/src/api/apiResult.ts`
- Delete: 旧 API 文件

- [ ] **Step 1: 修改 `web/src/api/apiResult.ts` 的 token 清理**

把 `handleLoginExpiration` 中的 `useAuthStore.getState().removeToken()` 改为 `useAuthStore.getState().clearToken()`，并把跳转目标从 `#/login` 保留（未登录用户可点登录按钮；401 时跳登录仍合理）。即替换函数体为：

```ts
export function handleLoginExpiration(response: ApiResponse) {
  if (!API_AUTH_EXPIRED_CODES.has(response.code) || loginExpirationHandled)
    return

  loginExpirationHandled = true
  useAuthStore.getState().clearToken()
  useAuthStore.getState().setAdmin(false)

  if (window.location.hash !== '#/login')
    window.location.hash = '#/login'
}
```

- [ ] **Step 2: 删除旧 API 文件**

```bash
rm web/src/api/auth.ts web/src/api/user.ts web/src/api/public.ts
rm web/src/api/panel/users.ts web/src/api/panel/userConfig.ts web/src/api/panel/itemIcon.ts web/src/api/panel/itemIconGroup.ts web/src/api/panel/backup.ts
rm web/src/api/system/moduleConfig.ts web/src/api/system/file.ts
rmdir web/src/api/panel web/src/api/system 2>/dev/null || true
```

- [ ] **Step 3: 暂不提交（组件改造完成后一并 type-check）**

---

## Task 20: 删多用户组件 + 精简 AppStarter

**Files:**
- Delete: `web/src/components/apps/UsersPanel.tsx`, `web/src/components/apps/UserInfoPanel.tsx`
- Rewrite: `web/src/components/apps/AppStarter.tsx`

- [ ] **Step 1: 删除多用户组件**

```bash
rm web/src/components/apps/UsersPanel.tsx web/src/components/apps/UserInfoPanel.tsx
```

- [ ] **Step 2: 重写 `web/src/components/apps/AppStarter.tsx`**

```tsx
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import { useEffect, useState } from 'react'

import { GroupManager } from '@/components/apps/GroupManager'
import { ImportExportPanel } from '@/components/apps/ImportExportPanel'
import { StylePanel } from '@/components/apps/StylePanel'
import { FileManagerPanel } from '@/features/files/FileManagerPanel'

function Style() {
  return <StylePanel />
}

function Groups() {
  return <GroupManager />
}

function ImportExport() {
  return <ImportExportPanel />
}

function Files() {
  return <FileManagerPanel />
}

const apps = [
  { key: 'style', name: '样式设置', icon: <PaletteOutlinedIcon />, component: Style },
  { key: 'groups', name: '分组管理', icon: <FolderOutlinedIcon />, component: Groups },
  { key: 'files', name: '文件管理', icon: <FolderOutlinedIcon />, component: Files },
  { key: 'importExport', name: '导入导出', icon: <BackupOutlinedIcon />, component: ImportExport },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function AppStarter({ open, onClose }: Props) {
  const [activeKey, setActiveKey] = useState(apps[0].key)
  const active = apps.find(item => item.key === activeKey) ?? apps[0]
  const ActiveComponent = active.component

  useEffect(() => {
    if (!apps.some(app => app.key === activeKey))
      setActiveKey(apps[0].key)
  }, [activeKey])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>设置</DialogTitle>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ minHeight: 520 }}>
        <List sx={{ width: { xs: '100%', sm: 220 }, borderRight: { sm: 1 }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider' }}>
          {apps.map(app => (
            <ListItemButton
              key={app.key}
              selected={app.key === activeKey}
              onClick={() => setActiveKey(app.key)}
            >
              <ListItemIcon>{app.icon}</ListItemIcon>
              <ListItemText primary={app.name} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <ActiveComponent />
        </Box>
      </Stack>
    </Dialog>
  )
}
```

- [ ] **Step 3: 暂不提交**

---

## Task 21: 改造 GroupManager（走 store）

**Files:**
- Modify: `web/src/components/apps/GroupManager.tsx`

- [ ] **Step 1: 改 import 与数据源**

把开头的

```ts
import { deletes, edit, getList, saveSort } from '@/api/panel/itemIconGroup'
```

替换为

```ts
import { usePanelStore } from '@/store/panel'
```

- [ ] **Step 2: 组件内改为读 store、走 mutator**

在 `GroupManager` 函数体顶部加入 store 选择器（替换原有 `useState<ItemIconGroup[]>([])` 的 `groups` 来源）：

```ts
export function GroupManager() {
  const notify = useNotify()
  const confirm = useConfirm()
  const storeGroups = usePanelStore(s => s.groups)
  const upsertGroup = usePanelStore(s => s.upsertGroup)
  const deleteGroups = usePanelStore(s => s.deleteGroups)
  const replaceGroups = usePanelStore(s => s.replaceGroups)
  const [groups, setGroups] = useState<ItemIconGroup[]>(storeGroups)
  const [loading, setLoading] = useState(false)
  const [savingSort, setSavingSort] = useState(false)
  const [editing, setEditing] = useState<ItemIconGroup | null>(null)
  const [title, setTitle] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)

  useEffect(() => {
    setGroups(storeGroups)
  }, [storeGroups])
```

并把文件顶部已有的 `import { useEffect, useState } from 'react'` 保留（已存在）。

- [ ] **Step 3: 删除 `loadGroups`，改各 handler**

删除整个 `loadGroups` 函数及其 `useEffect(loadGroups, [])`。把 `handleSaveGroup`、`handleDelete`、`handleSaveSort` 改为：

```ts
  async function handleSaveGroup() {
    if (!title.trim()) {
      notify.error('分组名称不能为空')
      return
    }

    setSavingGroup(true)

    try {
      const res = await upsertGroup({
        ...editing,
        title: title.trim(),
      })

      if (res.code === 0) {
        notify.success(t('common.saveSuccess'))
        setEditing(null)
      }
      else {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
      }
    }
    finally {
      setSavingGroup(false)
    }
  }

  async function handleDelete(group: ItemIconGroup) {
    if (!group.id)
      return

    const ok = await confirm({
      title: t('common.delete'),
      content: t('common.deleteConfirmByName', { name: group.title ?? '' }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    const res = await deleteGroups([group.id])

    if (res.code === 0)
      notify.success(t('common.deleteSuccess'))
    else
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
  }

  async function handleSaveSort() {
    setSavingSort(true)

    try {
      const ordered = groups.map((group, index) => ({ ...group, sort: index + 1 }))
      const res = await replaceGroups(ordered)

      if (res.code === 0)
        notify.success(t('common.saveSuccess'))
      else
        notify.error(`${t('common.saveFail')}:${res.msg}`)
    }
    finally {
      setSavingSort(false)
    }
  }
```

`loading` 变量保留用于"暂无分组"判断（初始 false 即可）；若 lint 报未使用，将其用于 `loadGroups` 移除后的占位——可直接删除 `loading`/`setLoading` 及其相关 JSX（`!loading && groups.length === 0` 改为 `groups.length === 0`）。

- [ ] **Step 4: 暂不提交**

---

## Task 22: 改造 EditItemDialog（走 store）

**Files:**
- Modify: `web/src/components/common/EditItemDialog.tsx`

- [ ] **Step 1: 改 import**

把

```ts
import { edit, getSiteFavicon } from '@/api/panel/itemIcon'
```

替换为

```ts
import { getSiteFaviconStub } from '@/api/stubs'
import { usePanelStore } from '@/store/panel'
```

> 说明：`getSiteFavicon` 原为 stub（返回 -3）。新建 `web/src/api/stubs.ts` 承载该 stub（见 Step 2），保持"自动获取 favicon"按钮的现状（提示手动填写）。

- [ ] **Step 2: 新建 `web/src/api/stubs.ts`**

```ts
import type { SiteFaviconRequest, SiteFaviconResponse } from '@/types/panel'

export function getSiteFaviconStub(data: SiteFaviconRequest) {
  return Promise.resolve({
    code: -3,
    msg: `后端暂未提供 favicon 获取接口，请手动填写图片 URL：${data.url}`,
    data: {} as SiteFaviconResponse,
  })
}
```

- [ ] **Step 3: 组件内 `handleSave` 改走 store**

在 `EditItemDialog` 函数体顶部加入：

```ts
  const upsertItem = usePanelStore(s => s.upsertItem)
```

把 `handleSave` 中

```ts
      const res = await edit({
        ...form,
        url: normalizeUrl(form.url),
        lanUrl: normalizeUrl(form.lanUrl),
      })
```

替换为

```ts
      const res = await upsertItem({
        ...form,
        url: normalizeUrl(form.url),
        lanUrl: normalizeUrl(form.lanUrl),
      })
```

- [ ] **Step 4: `handleFetchFavicon` 改用 stub**

把

```ts
      const res = await getSiteFavicon({ url: form.url })
```

替换为

```ts
      const res = await getSiteFaviconStub({ url: form.url })
```

- [ ] **Step 5: 暂不提交**

---

## Task 23: 改造 BatchAddItemsDialog（走 store）

**Files:**
- Modify: `web/src/components/common/BatchAddItemsDialog.tsx`

- [ ] **Step 1: 改 import**

把

```ts
import { addMultiple } from '@/api/panel/itemIcon'
```

替换为

```ts
import { usePanelStore } from '@/store/panel'
```

- [ ] **Step 2: `handleSave` 改走 store**

在函数体顶部加入：

```ts
  const addItems = usePanelStore(s => s.addItems)
```

把

```ts
      const res = await addMultiple(items)
```

替换为

```ts
      const res = await addItems(items)
```

- [ ] **Step 3: 暂不提交**

---

## Task 24: 改造 StylePanel（走 store）

**Files:**
- Modify: `web/src/components/apps/StylePanel.tsx`

- [ ] **Step 1: 改 import**

把

```ts
import { API_SUCCESS_CODE } from '@/api/apiResult'
import { setUserConfig } from '@/api/panel/userConfig'
```

替换为

```ts
import { API_SUCCESS_CODE } from '@/api/apiResult'
```

（删除 `setUserConfig` 导入；保留 `usePanelStore` 既有导入）。

- [ ] **Step 2: `handleSave` 改走 store（复用 useApiAction，仅调用一次）**

> 重要：`setPanelConfig` 现在本身就是"乐观写本地 + PUT /panel + 回填"的完整动作。**不要**在成功分支再次调用 `setPanelConfig`，否则会触发重复 PUT。保留 `useApiAction` 的 `run` 来处理 `saving` 状态与通知即可。

`StylePanel` 函数体中已有 `const panelConfig = usePanelStore(s => s.panelConfig)` 与 `const setPanelConfig = usePanelStore(s => s.setPanelConfig)`、`const { loading: saving, run } = useApiAction()`。保留它们不变，只把 `handleSave` 改为：

```ts
  async function handleSave() {
    await run(
      () => setPanelConfig(form),
      {
        successMessage: () => t('common.saveSuccess'),
        errorMessage: response => `${t('common.saveFail')}:${response.msg}`,
      },
    )
  }
```

> `setPanelConfig(form)` 返回 `Promise<ApiResponse>`，`run` 会据 `code` 自动 success/error 提示并管理 `saving`。成功后 store 已乐观更新 `panelConfig`，无需额外动作。`API_SUCCESS_CODE` 导入若本文件不再使用可删除。

- [ ] **Step 3: 暂不提交**

---

## Task 25: 改造 ImportExportPanel（从 store 导出/导入）

**Files:**
- Modify: `web/src/components/apps/ImportExportPanel.tsx`

- [ ] **Step 1: 改 import**

把

```ts
import { getListByGroupId, addMultiple } from '@/api/panel/itemIcon'
import { edit as editGroup, getList as getGroupList } from '@/api/panel/itemIconGroup'
import { getUserConfig, setUserConfig } from '@/api/panel/userConfig'
```

替换为

```ts
import { usePanelStore } from '@/store/panel'
```

保留 `cleanGroup`/`cleanItem`/`isExportV1`/`HomelabPanelExportV1` 自 `@/utils/exportFormat` 的导入。

- [ ] **Step 2: 顶部加 store 选择器，并 `load()`**

在函数体顶部把

```ts
  const updatePanelConfigByCloud = usePanelStore(s => s.updatePanelConfigByCloud)
  const markPanelDataChanged = usePanelStore(s => s.markPanelDataChanged)
```

替换为

```ts
  const load = usePanelStore(s => s.load)
  const panelConfig = usePanelStore(s => s.panelConfig)
  const groups = usePanelStore(s => s.groups)
  const items = usePanelStore(s => s.items)
  const setPanelConfig = usePanelStore(s => s.setPanelConfig)
  const upsertGroup = usePanelStore(s => s.upsertGroup)
  const addItems = usePanelStore(s => s.addItems)
```

- [ ] **Step 3: `buildFrontendBackup` 改为读 store**

把整个 `buildFrontendBackup` 替换为（同步构造，不再请求网络）：

```ts
  function buildFrontendBackup(): FrontendBackupResult {
    return {
      data: {
        version: 1,
        exportedAt: new Date().toISOString(),
        panel: panelConfig,
        groups: groups.map((group) => {
          const groupItems = items.filter(item => item.itemIconGroupId === group.id)
          return { group, items: groupItems }
        }),
      },
    }
  }
```

并把 `handleExport` 中 `const fallback = await buildFrontendBackup()` 改为 `const fallback = buildFrontendBackup()`。

- [ ] **Step 4: `importData` 改为走 store**

把 `importData` 替换为：

```ts
  async function importData(data: HomelabPanelExportV1) {
    const ok = await confirm({
      title: '导入配置',
      content: '导入会保存面板配置，并将备份中的分组和图标作为新数据添加。当前版本使用前端顺序导入，不会清空现有数据。',
      confirmText: '导入',
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    setImporting(true)

    try {
      const configRes = await setPanelConfig(data.panel)

      if (configRes.code !== 0) {
        notify.error(`导入面板配置失败:${configRes.msg}`)
        return
      }

      for (const entry of data.groups) {
        const groupRes = await upsertGroup(cleanGroup(entry.group))

        if (groupRes.code !== 0) {
          notify.error(`导入分组失败:${groupRes.msg}`)
          return
        }

        // 新增分组在响应末尾；取最新 group id
        const latest = usePanelStore.getState().groups.at(-1)
        const groupId = latest?.id

        if (!groupId)
          continue

        const entryItems = entry.items.map(item => cleanItem(item, groupId))

        if (entryItems.length) {
          const itemRes = await addItems(entryItems)

          if (itemRes.code !== 0) {
            notify.error(`导入图标失败:${itemRes.msg}`)
            return
          }
        }
      }

      await load()
      notify.success('导入成功')
    }
    finally {
      setImporting(false)
      if (inputRef.current)
        inputRef.current.value = ''
    }
  }
```

- [ ] **Step 5: 暂不提交**

---

## Task 26: 改造 Home / useHomeData / useHomeActions / useHomeSort / HomeFloatingActions

**Files:**
- Modify: `web/src/pages/Home.tsx`
- Modify: `web/src/pages/home/useHomeData.ts`
- Modify: `web/src/pages/home/useHomeActions.ts`
- Modify: `web/src/pages/home/useHomeSort.ts`
- Modify: `web/src/pages/home/HomeFloatingActions.tsx`

- [ ] **Step 1: 重写 `useHomeData.ts`（走 getPanel + 装配 ItemGroup[]）**

```ts
import { useCallback, useState } from 'react'

import { getPanel } from '@/api/panel'
import { usePanelStore } from '@/store/panel'

import type { ItemGroup } from './types'

export function useHomeData() {
  const [items, setItems] = useState<ItemGroup[]>([])

  const loadList = useCallback(async () => {
    const res = await getPanel()

    if (res.code !== 0 || !res.data)
      return

    // 同步写入 panel store（供 GroupManager/StylePanel 等读取）
    usePanelStore.setState({
      siteName: res.data.siteName,
      panelConfig: { ...usePanelStore.getState().panelConfig, ...res.data.config },
      searchEngine: res.data.searchEngine,
      groups: res.data.groups,
      items: res.data.items,
    })

    const groups: ItemGroup[] = res.data.groups.map(group => ({
      ...group,
      hoverStatus: false,
      items: res.data!.items.filter(item => item.itemIconGroupId === group.id),
    }))

    setItems(groups)
  }, [])

  return {
    items,
    setItems,
    loadList,
  }
}
```

- [ ] **Step 2: 改 `useHomeActions.ts`（删除动作走 store）**

把

```ts
import { deletes } from '@/api/panel/itemIcon'
```

替换为

```ts
import { usePanelStore } from '@/store/panel'
```

并把 `handleDelete` 中

```ts
    const res = await deletes([item.id])

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      loadList()
    }
    else {
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }
```

替换为

```ts
    const res = await usePanelStore.getState().deleteItems([item.id])

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      await loadList()
    }
    else {
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }
```

- [ ] **Step 3: 改 `useHomeSort.ts`（排序走 store）**

把

```ts
import { saveSort } from '@/api/panel/itemIcon'
```

替换为

```ts
import { usePanelStore } from '@/store/panel'
```

并把 `handleSaveSort` 中构造 `sortItems` 与 `saveSort(...)` 的整段：

```ts
    const sortItems: SortItemRequest[] = group.items.reduce<SortItemRequest[]>((result, item, index) => {
      if (item.id)
        result.push({ id: item.id, sort: index + 1 })

      return result
    }, [])
    const res = await saveSort({ itemIconGroupId: group.id, sortItems })
```

替换为（用该分组重排后的全量 items 调 `replaceItems`）：

```ts
    const reordered = group.items.map((item, index) => ({ ...item, sort: index + 1 }))
    const others = items.flatMap(g => (g.id === group.id ? [] : (g.items ?? []).map((it, index) => ({ ...it, sort: index + 1 }))))
    const res = await usePanelStore.getState().replaceItems([...others, ...reordered])
```

并删除顶部不再使用的 `import type { SortItemRequest } from '@/types/common'`（若仅此处使用）。

> 注：`replaceItems` 触发 `PUT /panel`，成功后 `panelDataVersion++`，Home 的 `useEffect([panelDataVersion])` 会重新 `loadList()`，从而刷新顺序。

- [ ] **Step 4: 改 `HomeFloatingActions.tsx`（用 isAdmin）**

把

```ts
import { VisitMode } from '@/constants/auth'
```

删除，并把 `Props.visitMode: VisitMode | null` 与组件参数中的 `visitMode` 移除；把显示登录按钮的条件

```tsx
      {!canManage && visitMode === VisitMode.VISIT_MODE_PUBLIC && (
```

改为

```tsx
      {!canManage && (
```

完整新文件：

```tsx
import LanIcon from '@mui/icons-material/Lan'
import LoginIcon from '@mui/icons-material/Login'
import PublicIcon from '@mui/icons-material/Public'
import SettingsIcon from '@mui/icons-material/Settings'
import Fab from '@mui/material/Fab'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'

import { PanelStateNetworkModeEnum } from '@/constants/panel'
import { t } from '@/locales'

interface Props {
  canManage: boolean
  networkMode: PanelStateNetworkModeEnum | null
  showNetworkToggle?: boolean
  onOpenSettings: () => void
  onLogin: () => void
  onChangeNetwork: (mode: PanelStateNetworkModeEnum) => void
}

export function HomeFloatingActions({
  canManage,
  networkMode,
  showNetworkToggle,
  onOpenSettings,
  onLogin,
  onChangeNetwork,
}: Props) {
  return (
    <Stack spacing={1} sx={{ position: 'fixed', right: 10, bottom: 50 }}>
      {canManage && (
        <Tooltip title="设置">
          <Fab size="small" onClick={onOpenSettings}>
            <SettingsIcon />
          </Fab>
        </Tooltip>
      )}
      {!canManage && (
        <Tooltip title="登录">
          <Fab size="small" onClick={onLogin}>
            <LoginIcon />
          </Fab>
        </Tooltip>
      )}
      {showNetworkToggle && (
        <Tooltip title={networkMode === PanelStateNetworkModeEnum.lan ? t('panelHome.changeToWanModel') : t('panelHome.changeToLanModel')}>
          <Fab
            size="small"
            onClick={() => {
              onChangeNetwork(
                networkMode === PanelStateNetworkModeEnum.lan
                  ? PanelStateNetworkModeEnum.wan
                  : PanelStateNetworkModeEnum.lan,
              )
            }}
          >
            {networkMode === PanelStateNetworkModeEnum.lan ? <PublicIcon /> : <LanIcon />}
          </Fab>
        </Tooltip>
      )}
    </Stack>
  )
}
```

- [ ] **Step 5: 改 `Home.tsx`（canManage 用 isAdmin；移除 updatePanelConfigByCloud）**

把

```tsx
import { VisitMode } from '@/constants/auth'
```

删除；把

```tsx
  const { panelConfig, networkMode, panelDataVersion, setNetworkMode, updatePanelConfigByCloud } = usePanelStore()
```

改为

```tsx
  const { panelConfig, networkMode, panelDataVersion, setNetworkMode, load: loadPanel } = usePanelStore()
```

把 `canManage` 计算

```tsx
  const canManage = authStore.visitMode === VisitMode.VISIT_MODE_LOGIN && authStore.isLoggedIn()
```

改为

```tsx
  const canManage = Boolean(authStore.token) && authStore.isAdmin
```

把首屏加载 effect

```tsx
  useEffect(() => {
    updatePanelConfigByCloud()
  }, [updatePanelConfigByCloud])
```

改为

```tsx
  useEffect(() => {
    loadPanel()
  }, [loadPanel])
```

把 `HomeFloatingActions` 的 `visitMode={authStore.visitMode}` 这一行删除（该 prop 已移除）。

`Home.tsx` 中 `useAuthStore` 仍用于 `token`/`isAdmin`；保留 `const authStore = useAuthStore()`。

- [ ] **Step 6: 暂不提交**

---

## Task 27: 改造 AuthBootstrap / AppRouter / Login

**Files:**
- Modify: `web/src/components/common/AuthBootstrap.tsx`
- Modify: `web/src/router/AppRouter.tsx`
- Rewrite: `web/src/pages/Login.tsx`
- Modify: `web/src/constants/auth.ts`
- Modify: `web/src/types/login.ts`, `web/src/types/user.ts`, `web/src/types/panel.ts`

- [ ] **Step 1: 改 `AuthBootstrap.tsx`（不强制跳登录）**

把 `visitMode` 相关分支删除，保留 initialized 守卫：

```tsx
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'

interface Props {
  children: React.ReactNode
}

export function AuthBootstrap({ children }: Props) {
  const navigate = useNavigate()
  const initialized = useAuthStore(s => s.initialized)
  const isAdmin = useAuthStore(s => s.isAdmin)
  const bootstrapAuth = useAuthStore(s => s.bootstrapAuth)
  const location = useLocation()

  useEffect(() => {
    bootstrapAuth()
  }, [bootstrapAuth])

  useEffect(() => {
    if (!initialized)
      return

    // 已登录用户在 /login 页则跳回首页；未登录用户允许留在任意页（始终公开）
    if (location.pathname === '/login' && isAdmin)
      navigate('/', { replace: true })
  }, [initialized, isAdmin, location.pathname, navigate])

  if (!initialized) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return children
}
```

补上 `import { useLocation } from 'react-router-dom'`（与 `useNavigate` 同一处合并）。

- [ ] **Step 2: `AppRouter.tsx` 无需改动（保留原样）**

确认 `web/src/router/AppRouter.tsx` 不引用已删模块即可（原样可用）。

- [ ] **Step 3: 重写 `Login.tsx`（仅密码）**

```tsx
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { API_SUCCESS_CODE } from '@/api/apiResult'
import { login } from '@/api/admin'
import { useApiAction } from '@/hooks/useApiAction'
import { t } from '@/locales'
import { useAuthStore } from '@/store/auth'

export default function Login() {
  const navigate = useNavigate()
  const setToken = useAuthStore(s => s.setToken)
  const setAdmin = useAuthStore(s => s.setAdmin)
  const setInitialized = useAuthStore(s => s.setInitialized)
  const [password, setPassword] = useState('')
  const { loading, run } = useApiAction()

  async function handleSubmit() {
    const res = await run(
      () => login(password),
      {
        successMessage: () => t('login.welcomeMessage'),
      },
    )

    if (res?.code !== API_SUCCESS_CODE)
      return

    setToken(res.data.token)
    setAdmin(true)
    setInitialized(true)
    navigate('/')
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f2f6ff',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ textAlign: 'center', fontWeight: 700 }}>
              {t('common.appName')}
            </Typography>
            <TextField
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              type="password"
              fullWidth
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  handleSubmit()
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button fullWidth loading={loading} onClick={handleSubmit}>
              {t('login.loginButton')}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Powered By
              {' '}
              <a href="https://github.com/lz-wang/homelab-panel" target="_blank" rel="noreferrer">Homelab Panel</a>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
```

- [ ] **Step 4: 精简 `constants/auth.ts`**

```ts
// 认证相关常量。始终公开访问后不再区分访问模式，保留枚举仅为兼容历史引用。
export const IS_ALWAYS_PUBLIC = true
```

> 若 `VisitMode` 在改完后已无任何引用，可整个清空为上面的内容；若仍有引用，搜索全局把 `VisitMode` 引用替换为新语义。`grep -rn "VisitMode" web/src` 应在 Task 26/27 后无结果（除本文件）。

- [ ] **Step 5: 精简 `types/login.ts`**

```ts
export interface LoginResponse {
  token: string
  expiresAt?: string
}
```

（删除 `LoginRequest` 与 `UserInfo` 依赖；`login()` 入参直接用 `string`。）

- [ ] **Step 6: 精简 `types/user.ts`**

```ts
export interface UpdatePasswordRequest {
  oldPassword: string
  newPassword: string
}
```

> 其余 `UserInfo`/`AuthInfoResponse`/`SaveUserRequest`/`AppSetting` 等仅在已删文件中使用，可整体精简为上面内容。若 `AppSetting` 等还有残留引用，先 `grep` 确认无引用后再删。

- [ ] **Step 7: 检查 `types/panel.ts`**

`PublicHomeResponse`、`UserConfig` 仅被已删的 adapters/旧 API 使用。在 Task 16 重写 adapters 后已不引用。删除 `types/panel.ts` 中的 `PublicHomeResponse` 与 `UserConfig` 接口（保留 `PanelConfig`/`ItemInfo`/`ItemIcon`/`ItemIconGroup`/`FileInfo`/`Upload*` 等）。

- [ ] **Step 8: 暂不提交**

---

## Task 28: 改 FileManagerPanel 的 import 路径

**Files:**
- Modify: `web/src/features/files/FileManagerPanel.tsx`

- [ ] **Step 1: 改 import**

把

```ts
import { deletes, getList, uploadFiles } from '@/api/system/file'
```

替换为

```ts
import { deletes, getList, uploadFiles } from '@/api/files'
```

其余逻辑不变（`getList` 仍返回 `{list, count}`）。

- [ ] **Step 2: 暂不提交**

---

## Task 29: 前端类型检查 / lint / 测试 / 构建

**Files:** 无改动

- [ ] **Step 1: 类型检查**

Run: `cd web && npm run type-check`
Expected: 无错误。若有"模块不存在"或类型不匹配，按报错定位修复（常见：遗漏删除的 `VisitMode`/`UserInfo` 引用、`updatePanelConfigByCloud`/`markPanelDataChanged` 残留调用）。

- [ ] **Step 2: 修复残留引用**

Run: `cd .. && grep -rn "updatePanelConfigByCloud\|markPanelDataChanged\|panel/users\|panel/userConfig\|panel/itemIcon\|panel/backup\|system/moduleConfig\|system/file'\|@/api/auth'\|@/api/user'\|@/api/public'\|VisitMode\|isLoggedIn\|removeToken\|setUserInfo\|setVisitMode" web/src`
Expected: 无输出（除 `constants/auth.ts` 中可能的注释）。逐项修复。

- [ ] **Step 3: lint**

Run: `cd web && npm run lint`
Expected: 无错误（warning 可接受）。必要时 `npm run lint:fix`。

- [ ] **Step 4: 单测**

Run: `cd web && npm run test`
Expected: 既有 `utils.test.ts`/`format.test.ts`/`url.test.ts` 等通过。

- [ ] **Step 5: 提交前端改造**

```bash
git add -A
git commit -m "refactor(前端): 适配 GET/PUT /panel 单一文档契约并移除多用户"
```

---

## Task 30: 端到端构建与浏览器验证

**Files:** 无改动

- [ ] **Step 1: 构建前后端**

Run: `cd /Users/lzwang/projects/homelab-panel && rm -rf data && make build`
Expected: 前端构建成功，Go 构建成功，生成 `homelab-panel`。

- [ ] **Step 2: 启动并记录首启密码**

Run: `./homelab-panel serve`
Expected: 控制台打印管理员密码 `<PWD>`；监听 `:3002`。

- [ ] **Step 3: 浏览器验证（匿名）**

打开 `http://127.0.0.1:3002/`。预期：直接看到首页（空面板，背景 + 标题 "Homelab Panel"），无需登录；右下角有"登录"按钮。

- [ ] **Step 4: 浏览器验证（登录后编辑）**

点"登录"→ 输入 `<PWD>` → 进入首页。点"设置"：
- 样式设置：改标题/背景/模糊 → 保存 → 刷新仍生效。
- 分组管理：新增分组、改名、上下移、保存排序、删除 → 均生效。
- 文件管理：上传图片、删除。
- 导入导出：导出 JSON；再导入。
回到首页：新增图标（含 Iconify/图片/文字三种）、编辑、批量添加、拖拽排序、删除、内外网切换 → 全部生效。
刷新页面：数据持久（来自 JSON 文件）。

- [ ] **Step 5: 数据文件确认**

Run（新终端）: `cat data/homelab-panel.json | head -40`
Expected: 包含 `admin.passwordHash`、`panel.{siteName,config,searchEngine,groups,items}`、`files`、`nextId`。

- [ ] **Step 6: 验收清单核对**

- [ ] `go.mod` 无 gorm/sqlite/swag/uuid
- [ ] 无 `User`/`Session` 模型、无 users.go/settings.go/user_config.go/groups.go/items.go/db.go、无 password-reset CLI
- [ ] 数据文件为 `./data/homelab-panel.json`，无 `data/data.db`
- [ ] 匿名 `GET /panel` 可读；带 token `PUT /panel` 可写；悬空 groupId → 409
- [ ] 前端匿名可见、登录后全部既有能力可用
- [ ] 无多用户相关 UI

- [ ] **Step 7: 停服并提交（如有残留 fixup）**

Ctrl-C 停服。若验证中发现并修复了问题，提交：

```bash
git add -A && git commit -m "fix: 端到端验证修复"
```

---

## 验收后的收尾

- 全部任务完成后，分支 `refactor/json-store-single-admin` 上应包含：spec（已提交）、本计划文档、各阶段实现提交。
- 可选：合并回 `main`（由用户决定）。
