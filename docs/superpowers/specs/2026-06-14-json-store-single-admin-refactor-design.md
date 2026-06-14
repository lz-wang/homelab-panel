# JSON 文件存储 + 单管理员改造设计

- 日期：2026-06-14
- 参考方案：`/Users/lzwang/playground/plan-1.md`
- 范围：后端大幅简化（去 SQLite/GORM/多用户）+ 前端适配新契约，**保留前端全部现有能力**

---

## 1. 背景与现状

当前 `homelab-panel` 是多用户系统：SQLite + GORM，含 `User`/`Session`/`Group`/`Item`/`UserConfig`/`AppSetting`/`File` 模型；认证为用户名+密码 → 会话 token；公开访问由 `PublicEnabled` 开关 + 指定"公开用户"实现；REST API 细粒度（auth、users、groups、items、settings、files、public/home）。

前端为 React 19 + MUI + Zustand + React Router（HashRouter）+ axios，承载远超"链接网格"的能力：丰富的 `PanelConfig` 样式（背景/模糊/遮罩/图标风格/时钟/搜索框/logo/footer/边距/内外网切换）、结构化 `ItemIcon`、搜索引擎配置、客户端导入导出。

`plan-1.md` 提出后端极简化（单管理员密码、JSON 文件、默认公开、9 路由），但其 `Panel` 模型（仅 siteName+groups+items）无法承载前端的富配置。

## 2. 目标

- 后端：删除 SQLite/GORM/swag/uuid 及多用户体系，改为单管理员密码 + 单个 JSON 文件 + 内存 token。
- 前端：适配新 API 契约（`GET/PUT /panel` 单一文档），**保留全部既有编辑与展示能力**。
- 默认公开访问；登录仅用于解锁编辑。

## 3. 非目标

- 不迁移存量 `data/data.db`（全新开始）。
- 不实现 favicon 抓取（保持前端 stub）。
- 不做备份的后端接口（导入导出保持客户端实现）。
- 不保留多用户、用户管理、邀请码、模块配置等已废弃功能。

## 4. 关键决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 功能范围 | 保留前端全部能力 | 仅做后端简化，不降级产品 |
| 公开访问 | 始终公开（移除隐私开关） | 符合方案；homelab 内网场景 |
| 存量数据 | 全新开始 | 个人项目，避免一次性迁移代码 |
| 写 API 粒度 | 单一文档 `GET/PUT /panel` | 符合方案；数据小、单管理员无并发；JSON 即唯一真相源 |
| 文件列表 | 独立管理员 `GET /files` | 避免向匿名暴露上传清单、撑大公开载荷（小偏离方案） |
| 样式存储 | `json.RawMessage` 透传 | 后端不解释样式字段，避免前后端耦合 |
| 响应契约 | 裸 JSON + HTTP 状态码；错误 `{"error":...}` | 前端 `apiResult.ts` 天然兼容；契合方案 RESTful 风格 |

## 5. 后端架构

```
cmd/homelab-panel/main.go          CLI: serve（删除 password-reset 占位）
internal/
  app/{app,config,server,router}.go
  data/{models,store}.go           纯 JSON 结构 + 原子读写 Store
  handlers/{handlers,middleware,response,auth,panel,files,static,public}.go
data/homelab-panel.json            首次启动生成
data/uploads/                      上传文件
web/dist/                          embed.FS 嵌入
```

删除：`internal/data/db.go`、`internal/handlers/{users,settings,user_config,groups,items,public(home部分)}.go`（按文件合并/删除）、GORM 模型、AutoMigrate、Seed、password-reset CLI。

依赖目标：`go.mod` 仅保留 `gin`、`urfave/cli/v2`、`zap`、`golang.org/x/crypto`；移除 `gorm.io/gorm`、`glebarez/sqlite`、`swaggo/swag`、`google/uuid`。

## 6. JSON 数据模型

```go
type StoreData struct {
	Version   int       `json:"version"` // = 1
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
	Config       json.RawMessage `json:"config"`        // PanelConfig 样式，透传
	SearchEngine json.RawMessage `json:"searchEngine"`  // 搜索引擎配置，透传
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
	ID            int       `json:"id"`
	GroupID       int       `json:"groupId"`
	Title         string    `json:"title"`
	URL           string    `json:"url"`
	LANURL        string    `json:"lanUrl,omitempty"`
	Description   string    `json:"description,omitempty"`
	Icon          *ItemIcon `json:"icon"`
	OpenMethod    string    `json:"openMethod"` // current | new_tab | iframe
	Sort          int       `json:"sort"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
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

说明：前端 `ItemIconGroup` 即后端 `Group`（分区）；前端 item 的 `itemIconGroupId` 即后端 `groupId`——仅一层分组。`Item.Icon` 由旧的 JSON 字符串升级为嵌套对象。`OpenMethod` 保留三种取值（含 `iframe`）。

## 7. Store 与认证

### Store（`internal/data/store.go`）

```go
type Store struct {
	mu     sync.RWMutex
	path   string
	data   StoreData
	logger *zap.Logger
}

func Open(path string, logger *zap.Logger) (*Store, string, error) // 返回首次启动明文密码（已存在则空串）
func (s *Store) Snapshot() StoreData                                // RLock 下深拷贝
func (s *Store) Save(fn func(*StoreData) error) error               // Lock；拷贝上执行 fn；成功则原子落盘并替换内存
func (s *Store) CheckPassword(password string) bool
func (s *Store) UpdatePassword(oldPassword, newPassword string) error
```

- 原子写：序列化 → 写临时文件（0600）→ `os.Rename` 替换。失败时内存状态不变。
- 首次启动：文件不存在 → 构造默认 `StoreData`（空分组/条目、默认 `PanelConfig` 由前端兜底，后端存 `{}`）→ 生成 20–24 位随机密码（`crypto/rand` hex）→ bcrypt 哈希 → 写盘 → **控制台明文打印一次**。
- `Snapshot` 返回值类型，handler 直接用，无需持锁。

### TokenManager（内存，`handlers` 内）

- `map[token]expiry` + mutex；token 为 `crypto/rand` 32 字节 hex；默认有效期 7 天。
- `Issue() string`、`Valid(token) bool`、`Revoke(token)`。
- 服务重启后全部失效，需重新登录（符合方案"token 只在内存中"）。

### 认证流程

- `POST /api/v1/admin/session {password}` → `CheckPassword` → `Issue` → `201 {token, expiresAt}`。
- `DELETE /api/v1/admin/session`（Bearer）→ `Revoke` → `204`。
- `PUT /api/v1/admin/password {oldPassword,newPassword}`（Bearer）→ `UpdatePassword` → `200`。
- 中间件 `RequireAdmin`：解析 `Authorization: Bearer <t>` → `TokenManager.Valid` → 失败 `401`。

## 8. REST API（最终）

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/v1/health` | 公开 | `{status:"ok"}` |
| GET | `/api/v1/about` | 公开 | `{name,version}` |
| GET | `/api/v1/panel` | 公开 | 返回 `Panel` 文档（siteName/config/searchEngine/groups/items），不含 admin/nextId/files |
| PUT | `/api/v1/panel` | 管理员 | 整体替换面板，返回规范化后的 `Panel` 文档 |
| POST | `/api/v1/admin/session` | 公开 | 登录 |
| DELETE | `/api/v1/admin/session` | 管理员 | 注销 |
| PUT | `/api/v1/admin/password` | 管理员 | 改密 |
| POST | `/api/v1/files` | 管理员 | 上传（multipart） |
| GET | `/api/v1/files` | 管理员 | 文件列表 |
| DELETE | `/api/v1/files/:id` | 管理员 | 删除文件 |
| GET | `/uploads/*filepath` | 公开 | 文件内容 |
| GET | `/*`（NoRoute） | 公开 | SPA 回退（web/dist） |

### `PUT /panel` 语义

- 请求体：`{siteName, config, searchEngine, groups[], items[]}`。
- 后端处理：
  - 新分组/条目（无 id 或 id 不存在）从 `NextID` 分配 id。
  - 按 id 匹配保留既有 `createdAt`；`updatedAt` 刷新为当前时间。
  - `sort`：按客户端传入的数组顺序补齐（缺失或 0 时按索引）。
  - 校验：每个 `item.groupId` 必须指向已存在分组，否则 `409`；分组名、条目 title/url 必填，否则 `400`。
  - `config`/`searchEngine` 原样存为 `json.RawMessage`（合法性由前端保证）。
- 成功返回规范化后的面板（`200`），并自增 `NextID`、刷新 `UpdatedAt`。
- 文件（`Files`）不随 `PUT /panel` 提交，由 `/files` 独立管理。

### 响应契约

- 成功：直接返回资源 JSON + 标准 HTTP 状态码（`200`/`201`/`204`）。
- 错误：`{"error":"<message>"}` + 状态码（`400`/`401`/`404`/`409`/`500`）。
- 前端 `apiResult.ts` 既有逻辑天然兼容：成功 body 非 `{code,msg,data}` 即视为 raw data（code=0）；错误按 HTTP status 取 code、从 `{error}` 取 msg；`401`/`403` 触发登录过期处理。

## 9. 前端改造

### API 层（`web/src/api`）

- 新增 `panel.ts`：`getPanel()`（`GET /panel`）、`savePanel(doc)`（`PUT /panel`）。
- 新增 `admin.ts`：`login(password)`、`logout()`、`changePassword(old,new)`。
- 保留 `files.ts`（指向 `/files`：upload/list/delete）。
- 删除：`auth.ts`、`user.ts`、`public.ts`、`panel/{users,userConfig,itemIcon,itemIconGroup,backup}.ts`、`system/moduleConfig.ts`。
- 重写 `adapters.ts`：面板文档 ↔ `{siteName, config: PanelConfig, searchEngine, groups: ItemIconGroup[], items: ItemInfo[]}`；`icon` 直接透传对象（移除 `JSON.stringify`/`parse`）；`openMethod` 保留 1/2/3 ↔ current/new_tab/iframe 映射。

### Store

- `store/panel.ts` 扩展：持有完整面板文档（含 groups/items/searchEngine）；`load()` 走 `GET /panel`；`save()` 防抖 `PUT /panel`（约 400ms）。提供 mutator：分组/条目的增删改、排序、批量新增、`patchConfig`、`patchSearchEngine`——每个改本地文档后触发存盘。保留现有 `panelConfig`/`networkMode` 派生逻辑。
- `store/auth.ts` 精简：`{token, isAdmin, initialized}`，移除 `userInfo`/`visitMode`。`bootstrap()`：始终加载面板；有 token 则置 `isAdmin=true`；任意 `401` 清 token 并 `isAdmin=false`。

### 路由与登录

- 始终公开 → `Home` 对所有人可见；编辑控件按 `isAdmin` 显隐。
- `AuthBootstrap`：不再强制跳转 `/login`；未登录显示"登录以编辑"入口。
- `pages/Login.tsx`：仅密码输入（移除用户名）。成功后存 token、`isAdmin=true`、跳转 `Home`。

### 组件

- 删除：`components/apps/UsersPanel.tsx`、`UserInfoPanel.tsx`（多用户功能）。
- 保留并改造：`GroupManager`、`StylePanel`、`ImportExportPanel`（导出/导入面板文档）、`EditItemDialog`、`BatchAddItemsDialog`、`FileManagerPanel`、`FilePickerDialog`、`AppStarter`、`ImageUploadButton` 等——改为调用 panel store 的 mutator 而非资源 API。
- `AppStarter`/`UserInfoPanel` 中引用 `userInfo` 的部分按"单管理员"语义简化或移除。

## 10. 偏离 plan-1.md 之处

1. **新增管理员 `GET /files`**：方案建议文件列表并入 `/panel`；本设计改为独立管理员接口（文件内容仍公开），避免向匿名暴露上传清单并撑大公开载荷。
2. **`Panel.Config`/`SearchEngine` 用 `json.RawMessage`**：方案的 `Panel` 仅 siteName+groups+items，无法承载样式；为保留全部能力而扩展，并以透传避免耦合。
3. **`Item.Icon` 为结构化对象、保留 `iframe` 打开方式**：方案为简单字符串，但前端图标是结构化对象且支持三种打开方式。

## 11. 验收标准

### 代码结构

- `go.mod` 无 `gorm.io/gorm`、`glebarez/sqlite`、`swaggo/swag`、`google/uuid`；仅 gin/cli/zap/crypto。
- 无 `User`/`Session` 数据模型；无 `users.go`/`settings.go`/`user_config.go`/`groups.go`/`items.go`/`db.go`；无 password-reset CLI。
- 数据文件为 `./data/homelab-panel.json`；删除 `data/data.db`。

### 后端行为

- 首次启动：控制台打印随机密码；`data/homelab-panel.json` 生成。
- `curl http://127.0.0.1:3002/api/v1/panel` 匿名可读（200）。
- `curl -X POST .../admin/session -d '{"password":"<首次密码>"}'` 返回 token（201）。
- 带 token `PUT /panel` 可存盘（200）；错误 token → 401。
- `PUT /panel` 带悬空 `groupId` → 409；缺必填 → 400。

### 前端行为

- 匿名直接看到面板（无需登录）。
- 登录后可使用全部既有能力：分组/条目增删改、排序、批量新增、样式编辑、内外网切换、图标编辑、导入导出、文件上传/管理。
- 无多用户相关 UI（用户管理、邀请码、个人资料等）。

## 12. 实现顺序（概览，详见实现计划）

1. 后端数据层：`models.go`（纯 JSON 结构）+ `store.go`（Open/Snapshot/Save/密码）。
2. 后端 handler：auth、panel、files、static、public；middleware/response；router 接线。
3. 后端清理：删 db.go 及多用户 handler；`go mod tidy`；删 `data/data.db`、swagger。
4. 前端 API 层：新增 panel/admin，重写 adapters，删旧 API 文件。
5. 前端 store：扩展 panel store（文档 + 防抖存盘）、精简 auth store。
6. 前端组件/路由：删多用户组件，改造编辑组件走 store，Login 改密码-only，AuthBootstrap 去强制登录。
7. 联调与验收（`make build` + 手工 curl + 浏览器验证）。
