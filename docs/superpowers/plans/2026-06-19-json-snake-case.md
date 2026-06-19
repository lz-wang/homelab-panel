# JSON 命名风格统一为 snake_case 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把磁盘持久化文件 `data/homelab-panel.json` 与 HTTP API 的 JSON key 由 camelCase 统一改为 snake_case，前端内部类型保持 camelCase、在 adapter 层做转换。

**Architecture:** 后端 `internal/data/models.go` 的 Go struct 与 handler 层共用，改 `json` tag 即让磁盘与 API 同时生效。前端 wire 类型字段名改 snake_case，`PanelConfig`/`SearchEngine`（后端以 `json.RawMessage` 透传）用通用递归工具 `keysToSnake`/`keysToCamel` 转换；组件与内部类型零改动。旧数据不迁移，升级前删除 `data/homelab-panel.json` 重新初始化。

**Tech Stack:** Go 1.26 + Gin + encoding/json；React 19 + TypeScript 6 + Vitest 4。Go 代码用 Tab 缩进，前端代码遵循 antfu 风格（无分号、单引号、2 空格）。

**Spec:** `docs/superpowers/specs/2026-06-19-json-snake-case-design.md`

---

## 文件结构

后端：
- 改 `internal/data/models.go` — 8 个 struct 的 `json` tag 改 snake_case
- 改 `internal/data/store.go` — `dataVersion` 1→2
- 新 `internal/data/models_test.go` — 序列化 snake_case key 断言
- 改 `internal/handlers/panel.go` — `panelRequest`/`itemInput` tag、`panelView()` gin.H key
- 改 `internal/handlers/auth.go` — `passwordRequest` tag、`CreateAdminSession` 响应 `expires_at`
- 新 `internal/handlers/wire_test.go` — wire key snake_case 断言

前端：
- 新 `web/src/utils/case.ts` — `keysToSnake`/`keysToCamel` 递归工具
- 新 `web/src/utils/case.test.ts`
- 改 `web/src/api/adapters.ts` — wire interface 字段名、映射函数、`PanelConfig` 转换
- 新 `web/src/api/adapters.test.ts`
- 改 `web/src/api/files.ts` — `BackendFile` 字段、`toFrontendFile`（导出）
- 新 `web/src/api/files.test.ts`
- 改 `web/src/api/admin.ts` — 请求 body key、`login` 返回类型

不改动：`web/src/types/**`、`web/src/components/**`、`web/src/store/**`、`web/src/utils/exportFormat.ts`、所有 `gin.H` 中的 `code`/`msg`/`data` 协议包装 key（已为小写）。

---

## Task 1: 后端 data 包 struct tag → snake_case

**Files:**
- Create: `internal/data/models_test.go`
- Modify: `internal/data/models.go`
- Modify: `internal/data/store.go:18`

- [ ] **Step 1: 写失败测试 `internal/data/models_test.go`**

```go
package data

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestStoreDataUsesSnakeCaseJSONKeys(t *testing.T) {
	now := time.Date(2026, 6, 19, 0, 0, 0, 0, time.UTC)
	d := StoreData{
		Version: 2,
		Admin: Admin{
			PasswordHash: "hash",
			CreatedAt:    now,
			UpdatedAt:    now,
		},
		Panel: Panel{
			SiteName:     "Lab",
			Config:       json.RawMessage(`{}`),
			SearchEngine: json.RawMessage(`{}`),
			Groups: []Group{
				{ID: 1, Name: "g1", CreatedAt: now, UpdatedAt: now},
			},
			Items: []Item{
				{
					ID: 1, GroupID: 1, Title: "i", URL: "https://a",
					LANURL: "http://lan", OpenMethod: "new_tab",
					Icon:      &ItemIcon{ItemType: 1, BackgroundColor: "#fff"},
					CreatedAt: now, UpdatedAt: now,
				},
			},
		},
		Files: []File{
			{ID: 1, OriginalName: "f.png", ObjectKey: "k", MimeType: "image/png", Size: 1, URL: "/u", CreatedAt: now},
		},
		NextID:    NextID{Group: 2, Item: 2, File: 2},
		CreatedAt: now,
		UpdatedAt: now,
	}

	raw, err := json.Marshal(d)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)

	for _, k := range []string{
		`"next_id"`, `"created_at"`, `"updated_at"`, `"password_hash"`,
		`"site_name"`, `"search_engine"`, `"group_id"`, `"lan_url"`,
		`"open_method"`, `"item_type"`, `"background_color"`,
		`"original_name"`, `"object_key"`, `"mime_type"`,
	} {
		if !strings.Contains(got, k) {
			t.Errorf("expected snake_case key %s in JSON, got: %s", k, got)
		}
	}
	for _, k := range []string{
		`"nextId"`, `"createdAt"`, `"updatedAt"`, `"passwordHash"`,
		`"siteName"`, `"searchEngine"`, `"groupId"`, `"lanUrl"`,
		`"openMethod"`, `"itemType"`, `"backgroundColor"`,
		`"originalName"`, `"objectKey"`, `"mimeType"`,
	} {
		if strings.Contains(got, k) {
			t.Errorf("camelCase key %s should not appear, got: %s", k, got)
		}
	}
}
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `go test ./internal/data/ -run TestStoreDataUsesSnakeCaseJSONKeys -v`
Expected: FAIL — 报告缺少 `next_id` 等 snake_case key（当前 tag 仍是 camelCase）。

- [ ] **Step 3: 改 `internal/data/models.go`，把所有 struct tag 改为 snake_case**

完整替换为：

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
	NextID    NextID    `json:"next_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Admin struct {
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Panel struct {
	SiteName     string          `json:"site_name"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"search_engine"`
	Groups       []Group         `json:"groups"`
	Items        []Item          `json:"items"`
}

type Group struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Icon      string    `json:"icon,omitempty"`
	Sort      int       `json:"sort"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	LANURL      string    `json:"lan_url,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	OpenMethod  string    `json:"open_method"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ItemIcon struct {
	ItemType        int    `json:"item_type"`
	Src             string `json:"src,omitempty"`
	Text            string `json:"text,omitempty"`
	Color           string `json:"color,omitempty"`
	BackgroundColor string `json:"background_color,omitempty"`
}

type File struct {
	ID           int       `json:"id"`
	OriginalName string    `json:"original_name"`
	ObjectKey    string    `json:"object_key"`
	MimeType     string    `json:"mime_type"`
	Size         int64     `json:"size"`
	URL          string    `json:"url"`
	CreatedAt    time.Time `json:"created_at"`
}

type NextID struct {
	Group int `json:"group"`
	Item  int `json:"item"`
	File  int `json:"file"`
}
```

- [ ] **Step 4: 改 `internal/data/store.go:18`，`dataVersion` 升至 2**

将：
```go
const dataVersion = 1
```
改为：
```go
const dataVersion = 2
```

- [ ] **Step 5: 运行 data 包全部测试，确认通过**

Run: `go test ./internal/data/ -v`
Expected: PASS — 新测试通过；现有 `TestOpenFirstRunCreatesFileAndPassword`、`TestSaveAtomicAndVisible` 等通过 struct 字段访问，不受 tag 影响。

- [ ] **Step 6: 提交**

```bash
git add internal/data/models.go internal/data/store.go internal/data/models_test.go
git commit -m "refactor(后端): 存储与 API JSON key 统一为 snake_case"
```

---

## Task 2: 后端 handler 层 wire key → snake_case

**Files:**
- Create: `internal/handlers/wire_test.go`
- Modify: `internal/handlers/panel.go:14-39, 213-229`
- Modify: `internal/handlers/auth.go:16-19, 36`

- [ ] **Step 1: 写失败测试 `internal/handlers/wire_test.go`**

```go
package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"homelab-panel/internal/data"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func TestPanelRequestUsesSnakeCaseJSONKeys(t *testing.T) {
	raw, err := json.Marshal(panelRequest{
		SiteName:     "Lab",
		SearchEngine: json.RawMessage(`{}`),
		Groups:       []groupInput{{ID: 1, Name: "g"}},
		Items: []itemInput{
			{GroupID: 1, Title: "i", URL: "https://a", LANURL: "http://lan", OpenMethod: "new_tab"},
		},
	})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)
	for _, k := range []string{`"site_name"`, `"search_engine"`, `"group_id"`, `"lan_url"`, `"open_method"`} {
		if !strings.Contains(got, k) {
			t.Errorf("expected %s in panelRequest JSON, got: %s", k, got)
		}
	}
	for _, k := range []string{`"siteName"`, `"searchEngine"`, `"groupId"`, `"lanUrl"`, `"openMethod"`} {
		if strings.Contains(got, k) {
			t.Errorf("camelCase %s should not appear, got: %s", k, got)
		}
	}
}

func TestPasswordRequestUsesSnakeCaseJSONKeys(t *testing.T) {
	raw, err := json.Marshal(passwordRequest{OldPassword: "old", NewPassword: "new"})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)
	for _, k := range []string{`"old_password"`, `"new_password"`} {
		if !strings.Contains(got, k) {
			t.Errorf("expected %s, got: %s", k, got)
		}
	}
}

func TestPanelViewUsesSnakeCaseKeys(t *testing.T) {
	view := panelView(data.Panel{SiteName: "Lab"})
	raw, err := json.Marshal(view)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	got := string(raw)
	for _, k := range []string{`"site_name"`, `"search_engine"`, `"groups"`, `"items"`} {
		if !strings.Contains(got, k) {
			t.Errorf("expected %s in panelView, got: %s", k, got)
		}
	}
	if strings.Contains(got, `"siteName"`) || strings.Contains(got, `"searchEngine"`) {
		t.Errorf("camelCase key should not appear in panelView, got: %s", got)
	}
}

func TestCreateAdminSessionResponseUsesSnakeCase(t *testing.T) {
	gin.SetMode(gin.TestMode)
	logger, _ := zap.NewDevelopment()
	store, password, err := data.Open(filepath.Join(t.TempDir(), "homelab-panel.json"), logger)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	h := NewHandler(Deps{Store: store, DataDir: t.TempDir()})
	r := gin.New()
	r.POST("/api/v1/admin/session", h.CreateAdminSession)

	body, _ := json.Marshal(sessionRequest{Password: password})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/session", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (body=%s)", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), `"expires_at"`) {
		t.Errorf("expected expires_at in session response, got: %s", w.Body.String())
	}
	if strings.Contains(w.Body.String(), `"expiresAt"`) {
		t.Errorf("camelCase expiresAt should not appear, got: %s", w.Body.String())
	}
}
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `go test ./internal/handlers/ -run 'TestPanelRequest|TestPasswordRequest|TestPanelView|TestCreateAdminSessionResponse' -v`
Expected: FAIL — 当前 wire 仍是 camelCase（`siteName`/`groupId`/`oldPassword`/`expiresAt` 等）。

- [ ] **Step 3: 改 `internal/handlers/panel.go` 的请求 struct tag**

将 `panelRequest`（第 14-20 行）与 `itemInput`（第 29-39 行）替换为：

```go
type panelRequest struct {
	SiteName     string          `json:"site_name"`
	Config       json.RawMessage `json:"config"`
	SearchEngine json.RawMessage `json:"search_engine"`
	Groups       []groupInput    `json:"groups"`
	Items        []itemInput     `json:"items"`
}
```

```go
type itemInput struct {
	ID          int            `json:"id"`
	GroupID     int            `json:"group_id"`
	Title       string         `json:"title"`
	URL         string         `json:"url"`
	LANURL      string         `json:"lan_url"`
	Description string         `json:"description"`
	Icon        *data.ItemIcon `json:"icon"`
	OpenMethod  string         `json:"open_method"`
	Sort        int            `json:"sort"`
}
```

> `groupInput`（id/name/icon/sort）字段全为单词，无需改动。

- [ ] **Step 4: 改 `internal/handlers/panel.go` 的 `panelView()` gin.H key（第 222-228 行）**

将：
```go
	return gin.H{
		"siteName":     p.SiteName,
		"config":       config,
		"searchEngine": search,
		"groups":       p.Groups,
		"items":        p.Items,
	}
```
改为：
```go
	return gin.H{
		"site_name":     p.SiteName,
		"config":        config,
		"search_engine": search,
		"groups":        p.Groups,
		"items":         p.Items,
	}
```

- [ ] **Step 5: 改 `internal/handlers/auth.go` 的 `passwordRequest` tag（第 16-19 行）**

将：
```go
type passwordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}
```
改为：
```go
type passwordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}
```

- [ ] **Step 6: 改 `internal/handlers/auth.go` 的 `CreateAdminSession` 响应 key（第 36 行）**

将：
```go
	writeJSON(c, http.StatusCreated, gin.H{"token": token, "expiresAt": expires})
```
改为：
```go
	writeJSON(c, http.StatusCreated, gin.H{"token": token, "expires_at": expires})
```

- [ ] **Step 7: 运行 handler 测试，确认通过**

Run: `go test ./internal/handlers/ -v`
Expected: PASS — 新 wire 测试通过；现有 `TestUpdatePanelStatusCodes` 等用 struct 字段构造请求、断言 `view["groups"]`/`view["items"]`（不变），仍通过。

- [ ] **Step 8: 运行全部后端测试 + 构建**

Run: `go test ./... && go build ./...`
Expected: 全部 PASS，构建成功。

- [ ] **Step 9: 提交**

```bash
git add internal/handlers/panel.go internal/handlers/auth.go internal/handlers/wire_test.go
git commit -m "refactor(后端): handler 层 wire key 统一为 snake_case"
```

---

## Task 3: 前端 case 转换工具（TDD）

**Files:**
- Create: `web/src/utils/case.test.ts`
- Create: `web/src/utils/case.ts`

- [ ] **Step 1: 写失败测试 `web/src/utils/case.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { keysToCamel, keysToSnake } from './case'

describe('keysToSnake', () => {
  it('converts top-level camelCase keys', () => {
    expect(keysToSnake({ siteName: 'x', maxWidthUnit: 'px' })).toEqual({ site_name: 'x', max_width_unit: 'px' })
  })

  it('converts nested objects and arrays', () => {
    const input = { group: { itemIconGroupId: 1 }, items: [{ openMethod: 'new_tab' }] }
    expect(keysToSnake(input)).toEqual({ group: { item_icon_group_id: 1 }, items: [{ open_method: 'new_tab' }] })
  })

  it('handles the lanUrl boundary', () => {
    expect(keysToSnake({ lanUrl: 'http://x' })).toEqual({ lan_url: 'http://x' })
  })

  it('does not mutate the input', () => {
    const input = { siteName: 'x' }
    keysToSnake(input)
    expect(input).toEqual({ siteName: 'x' })
  })

  it('leaves non-object values untouched', () => {
    expect(keysToSnake('hello' as unknown)).toBe('hello')
    expect(keysToSnake(42 as unknown)).toBe(42)
    expect(keysToSnake(null as unknown)).toBe(null)
  })
})

describe('keysToCamel', () => {
  it('converts snake_case keys back to camelCase', () => {
    expect(keysToCamel({ site_name: 'x', max_width_unit: 'px' })).toEqual({ siteName: 'x', maxWidthUnit: 'px' })
  })

  it('is the inverse of keysToSnake for nested data', () => {
    const original = {
      panel: { backgroundImageSrc: 'a', searchBoxShow: true },
      list: [{ groupId: 1 }],
    }
    expect(keysToCamel(keysToSnake(original))).toEqual(original)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd web && npm test -- case`
Expected: FAIL — `Failed to resolve import './case'`（模块不存在）。

- [ ] **Step 3: 写实现 `web/src/utils/case.ts`**

```ts
type JsonObject = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, ch => `_${ch.toLowerCase()}`)
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())
}

function convertKeys(value: unknown, toSnake: boolean): unknown {
  if (Array.isArray(value))
    return value.map(item => convertKeys(item, toSnake))
  if (isPlainObject(value)) {
    const result: JsonObject = {}
    for (const [key, val] of Object.entries(value))
      result[toSnake ? toSnakeKey(key) : toCamelKey(key)] = convertKeys(val, toSnake)
    return result
  }
  return value
}

export function keysToSnake<T>(value: T): unknown {
  return convertKeys(value, true)
}

export function keysToCamel<T>(value: T): unknown {
  return convertKeys(value, false)
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd web && npm test -- case`
Expected: PASS — 全部用例通过。

- [ ] **Step 5: 提交**

```bash
git add web/src/utils/case.ts web/src/utils/case.test.ts
git commit -m "feat(前端): 新增 case 工具 keysToSnake/keysToCamel"
```

---

## Task 4: 前端 adapters wire 字段 → snake_case

**Files:**
- Create: `web/src/api/adapters.test.ts`
- Modify: `web/src/api/adapters.ts`

- [ ] **Step 1: 写失败测试 `web/src/api/adapters.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { toBackendItem, toBackendPanel, toFrontendItem, toFrontendPanel } from './adapters'

describe('toBackendPanel', () => {
  it('emits snake_case wire keys and converts PanelConfig', () => {
    const wire = toBackendPanel({
      siteName: 'Lab',
      config: { backgroundImageSrc: 'a.png', maxWidthUnit: 'px' },
      searchEngine: {},
      groups: [],
      items: [],
    })
    expect(wire.site_name).toBe('Lab')
    expect(wire.config).toEqual({ background_image_src: 'a.png', max_width_unit: 'px' })
  })
})

describe('toBackendItem', () => {
  it('maps fields to snake_case', () => {
    const wire = toBackendItem({ id: 1, icon: null, title: 't', url: 'u', openMethod: 2, itemIconGroupId: 3 })
    expect(wire.group_id).toBe(3)
    expect(wire.open_method).toBe('new_tab')
  })
})

describe('toFrontendPanel', () => {
  it('converts snake_case wire back to camelCase', () => {
    const fe = toFrontendPanel({
      site_name: 'Lab',
      config: { background_image_src: 'a.png' },
      search_engine: {},
      groups: [],
      items: [],
    })
    expect(fe.siteName).toBe('Lab')
    expect(fe.config).toEqual({ backgroundImageSrc: 'a.png' })
  })
})

describe('toFrontendItem', () => {
  it('reads snake_case item fields', () => {
    const fe = toFrontendItem({ group_id: 5, title: 't', url: 'u', icon: null, open_method: 'iframe' })
    expect(fe.itemIconGroupId).toBe(5)
    expect(fe.openMethod).toBe(3)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd web && npm test -- adapters`
Expected: FAIL — 当前 wire 类型字段为 `siteName`/`groupId`/`openMethod`，`w.site_name`/`w.group_id` 不存在（TS 类型错误 + 断言失败）。

- [ ] **Step 3: 改 `web/src/api/adapters.ts`，整文件替换为**

```ts
import type { ItemIcon, ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'
import { keysToCamel, keysToSnake } from '@/utils/case'

export interface PanelWire {
  site_name: string
  config: Record<string, unknown>
  search_engine: Record<string, unknown>
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
  group_id: number
  title: string
  url: string
  description?: string
  icon: ItemIcon | null
  open_method: string
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
    description: w.description ?? '',
    openMethod: toFrontendOpenMethod(w.open_method),
    sort: w.sort,
    itemIconGroupId: w.group_id,
  }
}

export function toBackendItem(it: ItemInfo): PanelItemWire {
  return {
    id: it.id,
    group_id: it.itemIconGroupId ?? 0,
    title: it.title,
    url: it.url,
    description: it.description ?? '',
    icon: it.icon ?? null,
    open_method: toBackendOpenMethod(it.openMethod),
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
    siteName: w.site_name ?? '',
    config: keysToCamel(w.config ?? {}) as PanelConfig,
    searchEngine: keysToCamel(w.search_engine ?? {}),
    groups: (w.groups ?? []).map(toFrontendGroup),
    items: (w.items ?? []).map(toFrontendItem),
  }
}

export function toBackendPanel(doc: FrontendPanel): PanelWire {
  return {
    site_name: doc.siteName,
    config: keysToSnake(doc.config) as Record<string, unknown>,
    search_engine: keysToSnake(doc.searchEngine ?? {}) as Record<string, unknown>,
    groups: doc.groups.map(toBackendGroup),
    items: doc.items.map(toBackendItem),
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd web && npm test -- adapters`
Expected: PASS。

- [ ] **Step 5: 类型检查，确认未破坏引用**

Run: `cd web && npm run type-check`
Expected: 通过（无 TS 错误）。组件只使用 `FrontendPanel`/内部 camelCase 类型，不直接访问 `PanelWire` 字段。

- [ ] **Step 6: 提交**

```bash
git add web/src/api/adapters.ts web/src/api/adapters.test.ts
git commit -m "refactor(前端): adapter wire 字段统一为 snake_case"
```

---

## Task 5: 前端 files / admin wire 字段 → snake_case

**Files:**
- Create: `web/src/api/files.test.ts`
- Modify: `web/src/api/files.ts`
- Modify: `web/src/api/admin.ts`

- [ ] **Step 1: 写失败测试 `web/src/api/files.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { toFrontendFile } from './files'

describe('toFrontendFile', () => {
  it('reads snake_case backend fields', () => {
    const info = toFrontendFile({
      id: 7,
      original_name: 'a.png',
      object_key: 'k',
      url: '/u',
      created_at: '2026-06-19',
    })
    expect(info).toEqual({
      id: 7,
      src: '/u',
      path: '/u',
      fileName: 'a.png',
      createTime: '2026-06-19',
      updateTime: '2026-06-19',
    })
  })

  it('falls back to object_key then url for fileName', () => {
    expect(toFrontendFile({ object_key: 'k', url: '/u' }).fileName).toBe('k')
    expect(toFrontendFile({ url: '/u' }).fileName).toBe('/u')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd web && npm test -- files`
Expected: FAIL — `toFrontendFile` 当前未导出（import 报错），且字段仍是 `originalName` 等。

- [ ] **Step 3: 改 `web/src/api/files.ts`，替换 `BackendFile` 与 `toFrontendFile`（导出）**

将第 4-21 行（`interface BackendFile` 与 `function toFrontendFile`）替换为：

```ts
interface BackendFile {
  id?: number
  original_name?: string
  object_key?: string
  url?: string
  created_at?: string
}

export function toFrontendFile(f: BackendFile): FileInfo {
  return {
    id: f.id ?? 0,
    src: f.url ?? '',
    path: f.url ?? '',
    fileName: f.original_name ?? f.object_key ?? f.url ?? '',
    createTime: f.created_at,
    updateTime: f.created_at,
  }
}
```

> 文件其余部分（`uploadImg`/`uploadFiles`/`getList`/`deletes`）不变，它们通过 `toFrontendFile` 间接读取新字段名。

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd web && npm test -- files`
Expected: PASS。

- [ ] **Step 5: 改 `web/src/api/admin.ts` 的请求 body key 与 login 返回类型**

将：
```ts
export function login(password: string) {
  return post<{ token: string, expiresAt?: string }>({ url: '/admin/session', data: { password } })
}
```
改为：
```ts
export function login(password: string) {
  return post<{ token: string, expires_at?: string }>({ url: '/admin/session', data: { password } })
}
```

将：
```ts
export function changePassword(oldPassword: string, newPassword: string) {
  return put<{ ok: boolean }>({ url: '/admin/password', data: { oldPassword, newPassword } })
}
```
改为：
```ts
export function changePassword(oldPassword: string, newPassword: string) {
  return put<{ ok: boolean }>({ url: '/admin/password', data: { old_password: oldPassword, new_password: newPassword } })
}
```

- [ ] **Step 6: 确认无其他地方消费 `expiresAt` 字段**

Run: `cd web && grep -rn "expiresAt" src` （或用编辑器搜索）
Expected: 无业务代码引用 `expiresAt`（`web/src/store/auth.ts` 只存 `token`，不读 `expiresAt`）。若发现引用，将其改为 `expires_at`。

- [ ] **Step 7: 类型检查 + 全部前端测试**

Run: `cd web && npm run type-check && npm test`
Expected: 通过；`exportFormat.test.ts` 等既有测试不受影响（导出格式仍 camelCase）。

- [ ] **Step 8: 提交**

```bash
git add web/src/api/files.ts web/src/api/files.test.ts web/src/api/admin.ts
git commit -m "refactor(前端): files/admin wire 字段统一为 snake_case"
```

---

## Task 6: 全量验证与数据重置

**Files:** 无（验证 + 文档化操作）

- [ ] **Step 1: 后端全量验证**

Run: `go test ./... && go build ./...`
Expected: 全部 PASS，构建成功。

- [ ] **Step 2: 前端全量验证**

Run: `cd web && npm run lint && npm run type-check && npm test && npm run build`
Expected: lint、类型检查、单测、构建全部通过。

- [ ] **Step 3: 数据重置说明（运行前必做）**

旧的 `data/homelab-panel.json` 为 camelCase，新版无法解析。升级前需删除：
```bash
rm -f data/homelab-panel.json
```
`uploads/` 目录的二进制文件因 JSON 中 `File` 元数据引用失效成为孤儿，建议一并清理或重新配置：
```bash
rm -rf data/uploads
```
首次启动时 `Open()` 检测到文件不存在会初始化新的空 store（`Version: 2`）并打印一次性密码。

- [ ] **Step 4: 端到端冒烟（手动）**

1. `make build` 启动，从日志读取首启密码登录。
2. 设置面板：改站点名、上传图标、配置背景/搜索引擎，保存。
3. 停止服务，打开 `data/homelab-panel.json`，确认所有 key 为 snake_case（`site_name`、`created_at`、`group_id`、`lan_url`、`background_image_src` 等）。
4. 重新启动，确认配置完整加载（验证 `Open()` 回读 snake_case）。
5. 测试改密功能（验证 `old_password`/`new_password` wire）。

- [ ] **Step 5（可选）: 若 Step 4 发现遗漏的 wire key，补充并提交**

仅当冒烟测试发现遗漏的 camelCase wire key 时执行；否则跳过本步。

---

## 自检（plan 作者已完成）

**Spec 覆盖：**
- 磁盘存储 + API 全链路 snake_case → Task 1（models.go）、Task 2（handlers）
- 前端 wire snake_case / 内部 camelCase / adapter 转换 → Task 3（工具）、Task 4（adapters）、Task 5（files/admin）
- PanelConfig/SearchEngine 递归转换 → Task 3 + Task 4（`keysToSnake`/`keysToCamel`）
- 导出格式不变 → Task 5 Step 7 验证 `exportFormat.test.ts` 不受影响
- 数据重置 → Task 6 Step 3
- key 映射表全部覆盖 → Task 1 测试断言 14 个 snake_case key

**Spec 外补充（已在 plan 内覆盖，需执行者知晓）：**
- `expires_at`（登录响应）：spec 映射表遗漏，Task 2 Step 6 + Task 5 Step 5/6 覆盖。
- `code`/`msg`/`data` 协议包装 key 不改（已小写，非业务 camelCase key）。
- `OpenMethod` 值（`new_tab`/`current`/`iframe`）不改（是枚举值，非 key）。

**类型一致性：**
- `PanelWire.config` 类型由 `PanelConfig` 改为 `Record<string, unknown>`（wire 为 snake_case 未知结构），转换后 cast 回 `PanelConfig` —— Task 4 与 Task 1 的 raw message tag 一致。
- `toFrontendFile` 由未导出改为 `export`（Task 5 Step 3），供测试访问，无破坏性。
