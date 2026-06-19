# JWT 认证（替换内存 Token）设计

- 日期：2026-06-19
- 范围：后端 `internal/handlers`、`internal/data`；前端 `web/src/store/auth.ts`、`web/src/api/admin.ts`
- 目标：用无状态 JWT 替换内存 TokenManager，使登录态**跨进程重启存活**，避免每次重启都要重新登录

## 背景

当前认证链路存在一个核心问题：登录态依赖进程内存。

- `internal/handlers/tokens.go` 的 `TokenManager` 把签发的 opaque token 存在**内存** `map[string]time.Time`，TTL 7 天。
- `CreateAdminSession`（`auth.go`）验密后调用 `tokens.Issue()` 签发；`RequireAdmin`（`middleware.go`）从 `Authorization: Bearer` 取 token 查内存表校验。
- 前端 `store/auth.ts` 通过 zustand `persist` 把 token 持久化在 `localStorage`（key `AUTH_TOKEN`），`request.ts` 在请求头带上。
- **根因**：服务端进程重启后，内存 token 表清空，前端持久化的 token 在后端不再被认可 → 受保护接口 401 → 前端清 token 跳登录。即"每次重启都要重新登录"。

数据存储层：`data/homelab-panel.json`，`StoreData` 版本 `dataVersion=2`，含 `Admin{PasswordHash}`；`Store` 以 `mu sync.RWMutex` 保护，`Save(fn)` 做深拷贝 + 原子写（temp + rename）。`Open` 对版本不匹配的旧文件采用**备份后重置**策略。

## 需求（已确认）

1. 用 JWT 替换内存 TokenManager，登录态无状态、跨重启存活。
2. **撤销策略**：token 版本号机制。存储维护 `token_version`，JWT 携带 `ver` claim；登出 / 改密码时版本 +1，使所有旧 token 失效。
3. **有效期**：30 天。
4. **签名算法**：HS256，使用 `github.com/golang-jwt/jwt/v5`。
5. **语义**：
   - 登出 = 全设备登出（版本号 bump，单管理员面板可接受，且更安全）。
   - 改密码后**重签当前会话 token 并返回**——当前登录无缝继续，其他设备被踢。

## 架构概览

JWT 自身携带 `exp`，服务端只做三件事：验签 → 判过期 → 比对版本号。不持有任何 token 状态，因此跨重启天然有效。

撤销能力不靠服务端 token 表，而靠一个持久化的整数 `token_version`：

```
登录    验密 → IssueJWT(sub=admin, ver=N, exp=now+30d, jti=rand)
校验    验签 + exp 未过 + ver == Store.TokenVersion()
登出    IncrementTokenVersion()  →  N→N+1  →  旧 token 全部失效
改密    UpdatePassword() → IncrementTokenVersion() → 重签 token(ver=N+1) 返回
```

HS256 签名密钥与 `token_version` 一并持久化进 `data/homelab-panel.json`，重启后照旧可用。

## 详细设计

### 1. 数据模型 — `internal/data/models.go`

`StoreData` 新增 `Auth` 段（保持 `dataVersion=2` 不变）：

```go
type StoreData struct {
    Version   int       `json:"version"`
    Admin     Admin     `json:"admin"`
    Auth      Auth      `json:"auth"`      // 新增
    Panel     Panel     `json:"panel"`
    // ...其余不变
}

type Auth struct {
    Secret       string `json:"secret"`         // HS256 密钥，32 字节 hex
    TokenVersion int    `json:"token_version"`  // 撤销版本号
}
```

### 2. 存储访问器 — `internal/data/store.go`

新增**廉价访问器**（仅 `RLock`/`Lock` 读写单字段，**不走 `Snapshot` 深拷贝**，避免每个受保护请求都做一次 JSON 序列化）：

- `EnsureSecret() (string, error)`：若 `Auth.Secret` 为空则生成 32 字节随机 hex 并 `persist`；返回密钥。
- `TokenVersion() int`：`RLock` 读当前版本。
- `IncrementTokenVersion() (int, error)`：`Save` 中 `d.Auth.TokenVersion++`，返回新版本。

**关键约束：不 bump `dataVersion`。** 旧数据文件缺 `auth` 段 → 字段为零值 → `EnsureSecret` 懒生成、`TokenVersion` 视为 0。绝不触发 `Open` 里的"版本不匹配 → 备份重置"分支，以免清空面板数据。

### 3. JWT 签发/校验 — `internal/handlers/tokens.go`

整文件重写为基于 `golang-jwt/jwt/v5` 的无状态管理器，替换原 `TokenManager`：

```go
type TokenManager struct {
    store    *data.Store
    ttl      time.Duration
}

func NewTokenManager(store *data.Store, ttl time.Duration) *TokenManager

// Issue 签发 HS256 JWT，claims: sub=admin, ver=当前版本, iat, exp, jti(随机)。
func (m *TokenManager) Issue() (token string, expiresAt time.Time, err error)

// Validate 解析验签，返回 claims 与是否有效（签名正确、未过期、ver 与当前版本一致）。
func (m *TokenManager) Validate(token string) (*AdminClaims, bool)

func (m *TokenManager) Revoke() error  // = IncrementTokenVersion 的语义别名，供登出调用
```

`AdminClaims` 内含 `Version int`（`json:"ver"`），校验时与 `store.TokenVersion()` 比对。

### 4. 中间件 — `internal/handlers/middleware.go`

`RequireAdmin` 调整为：取 Bearer → `tokens.Validate` → 通过则 `c.Next()`，否则 401。不再把 token 字符串塞进 `c.Set`（版本号机制下，撤销以版本为准，无需持有具体 token）。

### 5. 认证 handler — `internal/handlers/auth.go`

- `CreateAdminSession`：验密 → `tokens.Issue()` → `201 {token, expires_at}`（响应结构不变）。
- `DeleteAdminSession`：`tokens.Revoke()`（bump 版本）→ `204`。
- `UpdateAdminPassword`：`Store.UpdatePassword` 成功后 `tokens.Revoke()` + `tokens.Issue()` 重签 → `200 {ok: true, token, expires_at}`。

### 6. 前端改动（最小）

- `store/auth.ts`：token 持久化逻辑不变。
- `types/login.ts`：`LoginResponse` 已含 `token` / `expires_at`，复用即可。
- `api/admin.ts` 的改密调用处：若响应带回新 `token`，调用 `setToken` 更新存储。
- 其余（`Authorization: Bearer`、401/403 清 token 跳登录 `handleLoginExpiration`）零改动。

## 安全 / 兼容

- HS256 密钥 32 字节随机、懒生成、持久化进 store；**必须排除在面板导出（`ImportExportPanel`）之外**，避免随配置泄露。
- **不 bump `dataVersion`**：旧文件平滑兼容，懒初始化填充 `auth` 段，绝不触发破坏性重置。
- 重启后 secret + version 已落盘 → token 继续有效 → **核心目标达成，无需重新登录**。
- 旧版本（内存 token）残留的 localStorage token，升级后首次请求验签失败 → 401 → 前端清 token 跳登录，属于一次性预期行为。

## 测试

- `internal/handlers/tokens_test.go` 重写：签发通过、过期失效、签名篡改失效、`ver` 不匹配（版本已 bump）失效。
- 新增：`UpdateAdminPassword` 后返回的 token 可用且 `ver` 已更新；登出后旧 token 失效。
- `internal/data` 测试：`EnsureSecret` 幼生成并持久化、`IncrementTokenVersion` 持久化与并发安全。
- `internal/handlers/panel_test.go`：调整对登录返回结构 / 登录态的断言。

## 不做（YAGNI）

- 不引入 refresh token（单管理员面板，30 天 + 版本撤销足够）。
- 不做按设备/会话粒度的撤销（版本号粒度已满足"登出全清"）。
- 不把密钥独立成单独文件（与现有存储一致即可）。
- 不 bump 数据版本、不做数据迁移。
