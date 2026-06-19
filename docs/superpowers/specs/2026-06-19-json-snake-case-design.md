# JSON 命名风格统一为 snake_case 设计

- 日期：2026-06-19
- 范围：后端 Go（`internal/`）+ 前端 API 适配层（`web/src/api/`、`web/src/utils/`）
- 目标：把存储到磁盘的 JSON 数据文件 `data/homelab-panel.json` 以及 HTTP API 传输的 JSON 的 key 风格，统一由 camelCase 改为 snake_case（小写字母 + 下划线）

## 背景

当前现状（已核实）：

- **唯一持久化文件**：`data/homelab-panel.json`，所有应用数据（admin、panel 配置、分组、导航项、文件元数据）集中存储在这一个文件里。读写全部经 `internal/data/store.go`（`Open()` 读、`persist()` 原子写）。
- **当前风格**：磁盘 JSON 的 key **全部是 camelCase**（如 `siteName`、`createdAt`、`groupId`、`lanUrl`），100% 一致，无混用、无 PascalCase 裸字段。
- **架构关键点**：磁盘存储与 HTTP API **共用同一套 Go struct**——`internal/data/models.go` 的 `StoreData`/`Panel`/`Group`/`Item`/`ItemIcon`/`File`/`NextID`/`Admin` 既用于持久化，handler 也直接复用（如 `data.ItemIcon`）。因此改 struct 的 `json` tag 会同时改变磁盘文件与 API 响应两边的 key。
- **`Panel.Config` / `Panel.SearchEngine`** 是 `json.RawMessage`：后端不解析其内部结构，原样透传；内部 key 由前端 `PanelConfig` 类型决定。
- **无迁移逻辑**：项目预留了 `StoreData.Version` 字段（当前 `dataVersion = 1`），但 `Open()` 直接 `Unmarshal`，不检查版本、不做数据转换。
- **前端**：内部 TS 类型（`web/src/types/*`）与组件使用 camelCase，与后端 API 的 camelCase 对齐；`web/src/api/adapters.ts` 仅做**语义重命名**（`title ↔ name`、`itemIconGroupId ↔ groupId`），不做大小写风格转换。导出格式 `HomelabPanelExportV1` 直接复用前端 camelCase 类型。

## 需求（已确认）

1. **范围**：磁盘存储 + HTTP API **全链路**统一 snake_case。
2. **前端分层**：HTTP wire 用 snake_case；前端 TS 内部类型与组件代码保持 camelCase（JS/TS 惯例）；在 `api/adapters.ts` 层做 camelCase ↔ snake_case 转换。
3. **旧数据**：**不迁移，重置**。升级前删除旧 `data/homelab-panel.json`，由 `Open()` 现有「文件不存在则初始化」逻辑生成新空文件。
4. 导出格式 `HomelabPanelExportV1` 保持 camelCase（复用前端类型），旧导出文件保持兼容。

## 架构概览

四层各自的角色：

| 层 | 风格 | 说明 |
|---|---|---|
| 磁盘存储 `data/homelab-panel.json` | snake_case | 后端 struct tag 改 snake_case，共用 struct 自动生效 |
| HTTP API wire（请求/响应） | snake_case | 同上，共用 struct |
| 前端内部 TS 类型 / 组件 / store | camelCase（不变） | 组件零改动 |
| 前端 adapter 层 | 转换 | `api/adapters.ts` 承担 camelCase ↔ snake_case + 原有语义映射 |
| 导出文件 `HomelabPanelExportV1` | camelCase（不变） | 复用前端类型，旧文件兼容 |

**方案 A（已确认）：混合转换策略**
- `Item`/`Group`/`File` 等结构固定、含语义映射的类型：手写 snake_case 的 wire interface + 映射函数（类型安全）。
- `PanelConfig`（字段多、后端以 `json.RawMessage` 透传）：用通用递归工具 `keysToSnake`/`keysToCamel` 转换。

## 详细设计

### 1. 后端 Go struct — `internal/data/models.go`

将以下 struct 的所有 `json` tag 由 camelCase 改为 snake_case（共用 struct，磁盘 + API 同时生效）。完整映射见文末「key 映射表」。

涉及 struct：`StoreData`、`Admin`、`Panel`、`Group`、`Item`、`ItemIcon`、`File`、`NextID`。

注意：`Panel.Config`、`Panel.SearchEngine` 的 tag 名本身（`config`/`search_engine`）要改，但其**内部** raw JSON 的 key 转换由前端负责（见第 3 节）。

### 2. 后端 handler 请求/响应 — `internal/handlers/`

- `panel.go`：`panelRequest`/`groupInput`/`itemInput` 的 `json` tag 改 snake_case；`panelView()` 返回的 `gin.H` 字面量 key 同步改 snake_case（与 `panelRequest` 对齐）。
- `auth.go`：`passwordRequest` 的 `oldPassword`→`old_password`、`newPassword`→`new_password`（`sessionRequest.password` 本身为单词，不变）。

### 3. 前端 adapter 层 — `web/src/api/`

- `adapters.ts`：`PanelWire`/`PanelGroupWire`/`PanelItemWire` 的字段名改 snake_case（如 `group_id`、`open_method`、`site_name`、`search_engine`），映射函数 `toBackendItem`/`toBackendGroup`/`toFrontendGroup` 等同步调整赋值；**语义映射保留**（`title ↔ name`、`itemIconGroupId ↔ group_id`）。
- `PanelConfig` 处理：发送前 `config: keysToSnake(panelConfig)`，接收后 `config: keysToCamel(wireConfig)`。`SearchEngine` 同理。
- `files.ts`：`BackendFile` 字段改 snake_case（`original_name`、`object_key`、`mime_type`、`created_at`）。
- `admin.ts`：改密请求 body 的 key 改 snake_case（`old_password`、`new_password`）。

### 4. 前端通用工具 — `web/src/utils/case.ts`（新文件）

- `keysToSnake(obj: unknown): unknown`：递归把对象所有 key 由 camelCase 转 snake_case（深入嵌套对象与数组）。
- `keysToCamel(obj: unknown): unknown`：反向转换。
- 算法：标准「大写字母前插下划线并小写」。项目字段无连续大写缩写（如 `HTMLParser`），故标准算法安全（`lanUrl → lan_url`、`maxWidthUnit → max_width_unit`）。
- 仅转换 object 的 **key**，不触碰 value（避免误伤字符串值）。

### 5. 不改动的部分

- 前端内部类型 `web/src/types/*`、所有组件 `web/src/components/**`、页面 `web/src/pages/**`、Zustand store `web/src/store/*`、localStorage。
- 导出格式 `web/src/utils/exportFormat.ts`（`HomelabPanelExportV1` 复用前端 camelCase 类型，自动保持 camelCase）。

### 6. 数据重置

- 升级前删除 `data/homelab-panel.json`。`Open()` 现有逻辑：文件不存在 → 初始化新空 store（`Version = dataVersion`）。
- `uploads/` 目录的二进制文件因 JSON 中 `File` 引用记录丢失而成为孤儿，建议一并清理或重新上传配置。
- `dataVersion` 由 `1` 升至 `2`，仅作为**新格式标记**（便于未来识别），**不触发**任何迁移逻辑。

## 数据流

**写入**（前端保存面板）：
前端 `PanelConfig`/`ItemInfo`（camelCase）→ `api/adapters.ts` 转换（语义映射 + `keysToSnake`）→ POST body（snake_case wire）→ 后端 struct（snake_case tag）→ `persist()` → 磁盘（snake_case）。

**读取**（前端加载面板）：
磁盘（snake_case）→ 后端 struct → API 响应（snake_case wire）→ `api/adapters.ts` 转换（`keysToCamel` + 语义映射）→ 前端 camelCase 类型 → 组件渲染。

**导出/导入**：前端 `HomelabPanelExportV1`（camelCase）直接序列化/解析，不经 adapter，不受 wire 风格影响。

## key 映射表（camelCase → snake_case）

后端 struct tag：

| 原始 | 新值 |
|---|---|
| `nextId` | `next_id` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `passwordHash` | `password_hash` |
| `siteName` | `site_name` |
| `searchEngine` | `search_engine` |
| `groupId` | `group_id` |
| `lanUrl` | `lan_url` |
| `openMethod` | `open_method` |
| `itemType` | `item_type` |
| `backgroundColor` | `background_color` |
| `originalName` | `original_name` |
| `objectKey` | `object_key` |
| `mimeType` | `mime_type` |
| `oldPassword` | `old_password` |
| `newPassword` | `new_password` |

不变（已是单词或全小写）：`version`、`admin`、`panel`、`files`、`config`、`groups`、`items`、`id`、`name`、`icon`、`sort`、`title`、`url`、`description`、`size`、`src`、`text`、`color`、`group`、`item`、`file`、`password`。

`PanelConfig` / `SearchEngine` 内部 key（由 `keysToSnake`/`keysToCamel` 自动转换，无需手改 tag）：`backgroundImageSrc → background_image_src`、`maxWidthUnit → max_width_unit`、`iconTextColor → icon_text_color`、`searchBoxShow → search_box_show` 等全部字段同理。

## 测试策略

- **后端**：更新 `internal/data/store_test.go` 中构造数据的 key（如有硬编码 JSON）；新增/调整断言验证 `persist()` 写出的 JSON 含 snake_case key、`Open()` 能正确回读。
- **前端 `case.test.ts`（新）**：覆盖 `keysToSnake`/`keysToCamel` 的递归、数组嵌套、`lanUrl`/`maxWidthUnit` 等边界、原对象不被 mutate。
- **前端 adapter 测试**：验证 wire interface 字段为 snake_case、`toBackend*`/`toFrontend*` 双向映射正确（含语义映射与 `PanelConfig` 风格转换）。
- **现有 `exportFormat.test.ts`**：确认导出格式仍为 camelCase（不受影响）。

测试栈沿用项目既有：Go `testing`（`go test ./...`）、Vitest（`web/src/**/*.test.ts(x)`）。

## YAGNI 边界（明确不做）

- 不做版本迁移代码（已确认重置数据）。
- 不做双向兼容读取（Unmarshal 不识别旧 camelCase key）。
- 不改前端内部 TS 类型与组件字段名（保持 camelCase）。
- 不改导出格式 `HomelabPanelExportV1`（保持 camelCase 兼容）。
- 不引入 Axios 全局拦截器做转换（避免误伤导出/下载等非 API JSON）。
- 不为 `PanelConfig` 手写 20+ 字段的 wire 映射（用通用递归工具）。

## 涉及文件清单

后端：
- 改：`internal/data/models.go`
- 改：`internal/data/store.go`（`dataVersion` 升至 2）
- 改：`internal/handlers/panel.go`
- 改：`internal/handlers/auth.go`
- 改（测试）：`internal/data/store_test.go`

前端：
- 改：`web/src/api/adapters.ts`
- 改：`web/src/api/files.ts`
- 改：`web/src/api/admin.ts`
- 新：`web/src/utils/case.ts`
- 新（测试）：`web/src/utils/case.test.ts`
- 检查（测试）：`web/src/utils/exportFormat.test.ts`

不改动：`web/src/types/**`、`web/src/components/**`、`web/src/pages/**`、`web/src/store/**`、`web/src/utils/exportFormat.ts`。

## 实现注意事项

- **共用 struct 的连带效应**：改 `models.go` 的 tag 会同时影响磁盘与 API；这是预期行为，正是「全链路统一」所需，无需为磁盘/API 拆分两套 struct。
- **`json.RawMessage` 的内部 key**：`Config`/`SearchEngine` 在后端透传，蛇形转换必须在前端 adapter 完成（发送前 `keysToSnake`、接收后 `keysToCamel`）；磁盘里存的即是转换后的 snake_case raw JSON。
- **转换算法边界**：项目字段无连续大写缩写，标准「大写前插下划线」算法对 `lanUrl`、`maxWidthUnit`、`searchBoxSearchIcon` 等均正确；仅转 key 不转 value。
- **`panelView()` 响应**：其 `gin.H` 字面量 key 必须与 `panelRequest` 对齐为 snake_case，否则前端 adapter 按新 key 取值会读不到。
- **重置确认**：实现前提醒用户删除旧 `data/homelab-panel.json`（及按需清理 `uploads/`），避免解析出零值数据。
