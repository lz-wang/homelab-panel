# 登录页「仅浏览」按钮与移除页脚文本 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在登录页增加一个绿色的「仅浏览」按钮（与登录按钮水平并排，点击后以浏览模式进入首页），并移除登录页底部「Powered By Homelab Panel」文本。

**Architecture:** 纯前端改动。复用应用已有的「始终公开」浏览模式——「仅浏览」按钮仅调用 `navigate('/')`、不写入任何认证 token，进入首页后 `canManage=false` 即纯浏览。无需后端、路由或认证状态变更。

**Tech Stack:** React + TypeScript + MUI (material-ui) + react-router-dom + vitest + @testing-library/react

对应设计文档：`docs/superpowers/specs/2026-06-19-login-browse-only-button-design.md`

---

## File Structure

- **Modify** `web/src/locales/zh-CN.json` — 在 `login` 对象新增 `browseOnlyButton` 文案
- **Modify** `web/src/pages/Login.tsx` — 删除页脚文本块；新增 `handleBrowseOnly`；将单个 fullWidth 登录按钮改为横向 `Stack` 双按钮
- **Create** `web/src/pages/Login.test.tsx` — 「仅浏览」导航行为与页脚移除断言

> 说明：`Stack`、`Button`、`useNavigate` 等均已在 `Login.tsx` 顶部导入，本计划不新增 import。

---

## Task 1: 写 Login 行为测试（红）

**Files:**
- Create: `web/src/pages/Login.test.tsx`

- [ ] **Step 1: 创建测试文件**

创建 `web/src/pages/Login.test.tsx`，完整内容：

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth'

import Login from './Login'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}))

vi.mock('@/hooks/useApiAction', () => ({
    useApiAction: () => ({ loading: false, run: vi.fn() }),
}))

describe('Login', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        localStorage.clear()
        useAuthStore.setState({ token: null, isAdmin: false, initialized: false })
    })

    it('点击「仅浏览」跳转首页且不写入登录态', () => {
        render(<Login />)

        fireEvent.click(screen.getByRole('button', { name: '仅浏览' }))

        expect(mockNavigate).toHaveBeenCalledWith('/')
        expect(mockNavigate).toHaveBeenCalledTimes(1)
        expect(useAuthStore.getState().token).toBeNull()
        expect(useAuthStore.getState().isAdmin).toBe(false)
    })

    it('不再展示 Powered By 页脚文本', () => {
        render(<Login />)

        expect(screen.queryByText(/Powered By/i)).not.toBeInTheDocument()
    })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd web && npx vitest run src/pages/Login.test.tsx`

Expected: **FAIL** ——
- 「点击「仅浏览」…」用例报错 `Unable to find an accessible element with the role "button" and name "仅浏览"`；
- 「不再展示 Powered By…」用例断言失败（文本仍存在）。

---

## Task 2: 实现「仅浏览」按钮并移除页脚文本（绿）

**Files:**
- Modify: `web/src/locales/zh-CN.json`
- Modify: `web/src/pages/Login.tsx`

- [ ] **Step 1: 新增 i18n 文案**

在 `web/src/locales/zh-CN.json` 的 `login` 对象中，`loginButton` 之后新增 `browseOnlyButton`：

old:
```json
  "login": {
    "loginButton": "登录",
    "passwordPlaceholder": "请输入密码",
```

new:
```json
  "login": {
    "loginButton": "登录",
    "browseOnlyButton": "仅浏览",
    "passwordPlaceholder": "请输入密码",
```

- [ ] **Step 2: 新增 handleBrowseOnly 处理函数**

在 `web/src/pages/Login.tsx` 中，紧接 `handleSubmit` 函数之后新增 `handleBrowseOnly`：

old:
```tsx
        setToken(res.data.token)
        setAdmin(true)
        setInitialized(true)
        navigate('/')
    }

    return (
```

new:
```tsx
        setToken(res.data.token)
        setAdmin(true)
        setInitialized(true)
        navigate('/')
    }

    function handleBrowseOnly() {
        navigate('/')
    }

    return (
```

- [ ] **Step 3: 替换登录按钮区为横向双按钮，并删除页脚文本**

在 `web/src/pages/Login.tsx` 中，把「单个 fullWidth 登录按钮 + Powered By Typography」整段替换为「横向 Stack 双按钮」：

old:
```tsx
                        <Button fullWidth loading={loading} onClick={handleSubmit}>
                            {t('login.loginButton')}
                        </Button>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textAlign: 'center' }}
                        >
                            Powered By{' '}
                            <a
                                href="https://github.com/lz-wang/homelab-panel"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Homelab Panel
                            </a>
                        </Typography>
```

new:
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

> `Button` 默认 `variant="contained"`（见 `web/src/theme/theme.ts`），两按钮均为实心；仅浏览用 MUI `color="success"`（标准绿）。`flex: 1` 让两按钮等宽平分。

- [ ] **Step 4: 运行 Login 测试，确认通过**

Run: `cd web && npx vitest run src/pages/Login.test.tsx`

Expected: **PASS**（2 个用例全部通过）。

- [ ] **Step 5: 运行全量测试，确认无回归**

Run: `cd web && npm run test`

Expected: 全部测试通过。

---

## Task 3: 验证与收尾

**Files:** 无（仅运行校验）

- [ ] **Step 1: 类型检查**

Run: `cd web && npm run type-check`

Expected: 无错误。

- [ ] **Step 2: lint（含 Prettier 格式检查）**

Run: `cd web && npm run lint`

Expected: 无错误、无警告（`--max-warnings=0`）。

- [ ] **Step 3: 生产构建**

Run: `cd web && npm run build`

Expected: 构建成功，产出 `web/dist`。

- [ ] **Step 4: 确认 diff 干净**

Run: `git diff --check`

Expected: 无空白错误输出。

---

## 提交说明

按项目 `CLAUDE.md` 约定，**不自动 commit / stage / push**。验证全部通过后由用户决定是否提交。建议提交信息：

```
feat(login): 增加仅浏览入口并移除页脚 Powered By 文本
```
