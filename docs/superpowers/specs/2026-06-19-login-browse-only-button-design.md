# 登录页「仅浏览」按钮与移除页脚文本 — 设计文档

- 日期：2026-06-19
- 范围：前端（`web/`）
- 涉及文件：`web/src/pages/Login.tsx`、`web/src/locales/zh-CN.json`

## 1. 背景与目标

用户希望：

1. 删除登录页底部「Powered By Homelab Panel」文本。
2. 在登录按钮所在行新增一个绿色的「仅浏览」按钮，与登录按钮水平并排。

### 现有认证模型（关键事实）

- 应用采用「始终公开」策略（`web/src/constants/auth.ts` 中 `IS_ALWAYS_PUBLIC = true`）。
- `web/src/store/auth.ts` 的 `bootstrapAuth`：无 token 时设置 `{ initialized: true, isAdmin: false }`，即未登录用户可正常进入面板，只是没有管理权限。
- `web/src/components/common/AuthBootstrap.tsx`：未登录用户允许停留在任意路由（注释明确「始终公开」），仅在 `initialized` 为 false 时显示 loading。
- `web/src/pages/Home.tsx:33`：`canManage = Boolean(authStore.token) && authStore.isAdmin`，未登录即 `canManage=false`，处于纯浏览模式。
- `web/src/pages/Home.tsx:210`：`HomeHeader` 已有 `onLogin={() => navigate('/login')}` 入口，浏览模式下用户可随时回到登录页。

结论：**「仅浏览」即跳转到首页、不设置 token，复用已有的浏览模式**。纯前端改动，无需任何后端、路由或认证状态变更。

## 2. 需求决策（已与用户确认）

| 决策点 | 选择 |
|--------|------|
| 「仅浏览」按钮行为 | 跳过登录，直接以浏览模式进入首页（`navigate('/')`，不设 token） |
| 按钮布局 | 与登录按钮水平并排在同一行，两按钮等宽平分 |
| 按钮颜色 | 实心绿：`contained` + MUI `color="success"` |

## 3. 设计

### 3.1 移除「Powered By Homelab Panel」文本

删除 `Login.tsx` 中第 81–94 行的整个 `Typography` 块（登录按钮下方的版权文本）。

> 说明：`web/src/store/panel.ts` 中的 `defaultFooterHtml` 是**首页面板**的可配置页脚（`footerHtml`），不属于登录页范围，本次不动。

### 3.2 「仅浏览」按钮

#### 布局

将现有的单个 `fullWidth` 登录按钮替换为一个横向容器，内含两个等宽按钮：

```tsx
<Stack direction="row" spacing={2}>
    <Button sx={{ flex: 1 }} loading={loading} onClick={handleSubmit}>
        {t('login.loginButton')}
    </Button>
    <Button sx={{ flex: 1 }} color="success" onClick={handleBrowseOnly}>
        {t('login.browseOnlyButton')}
    </Button>
</Stack>
```

- 登录按钮（左）：`contained`（theme 默认 variant）+ `primary`（蓝），保留 `loading` 与原 `handleSubmit`。
- 仅浏览按钮（右）：`contained` + `color="success"`（MUI 标准绿 `#2e7d32`）。
- 两按钮均 `flex: 1`，等高、等宽、平分整行；`spacing={2}` 提供按钮间隙。
- 登录按钮不再使用 `fullWidth`（由 `flex: 1` 控制宽度）。

#### 行为

新增事件处理函数：

```tsx
function handleBrowseOnly() {
    navigate('/')
}
```

- 不调用 `setToken` / `setAdmin` / `setInitialized`，保持未登录态。
- 直接 `navigate('/')` 进入首页，`Home` 中 `canManage=false`，即纯浏览模式。
- 无需修改 `auth.ts`：Login 页在 `AuthBootstrap` 完成（`initialized=true`）后才渲染，跳转后 `Home` 可正常加载。

### 3.3 国际化

在 `web/src/locales/zh-CN.json` 的 `login` 对象中新增：

```json
"browseOnlyButton": "仅浏览"
```

> 当前 locales 仅含 `zh-CN.json`，无英文 locale，故只新增中文 key。

## 4. 不做的事（YAGNI）

- 不为「仅浏览」创建独立路由或只读视图（复用现有浏览模式即可）。
- 不增加后端只读 token / 游客账号机制。
- 不为按钮增加图标（保持与现有登录按钮一致的纯文本风格）。
- 不修改首页 `defaultFooterHtml`（不在登录页范围）。

## 5. 验证

按 `CLAUDE.md` 的前端 UI 改动验证要求：

```bash
cd web && npm run lint
cd web && npm run build
git diff --check
```

不主动运行浏览器 / E2E 验证。

## 6. 改动文件清单

| 文件 | 改动 |
|------|------|
| `web/src/pages/Login.tsx` | 删除版权 `Typography`；新增 `handleBrowseOnly`；将单按钮改为横向 `Stack` 两按钮（登录 + 仅浏览） |
| `web/src/locales/zh-CN.json` | `login` 下新增 `browseOnlyButton: "仅浏览"` |
