# 前端颜色模式（亮/暗）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让前端支持亮色/暗色颜色模式，默认跟随设备，可在设置面板切换（三态：跟随设备/亮色/暗色）。

**Architecture:** 用 MUI 自身的 CSS 变量主题能力：在现有 `createTheme` 上启用 `cssVariables` + `colorSchemes`，`<ThemeProvider>` 不变；`useColorScheme()` 读写模式并自动持久化到 localStorage（`homelab-color-mode`）；`InitColorSchemeScript` 在 React 渲染前应用模式以消除首屏闪烁。颜色模式是纯本地偏好，不进服务端 `panelConfig`，与全访客共享的面板配置解耦。

**Tech Stack:** React 19、MUI 9.1.1（`createTheme` cssVariables、`useColorScheme`、`InitColorSchemeScript`、`ToggleButtonGroup`）、Vite 8、Vitest 4 + @testing-library/react、Zustand（不涉及）。

**对应 Spec:** `docs/superpowers/specs/2026-06-19-color-mode-design.md`

**全局约定:**
- 所有 shell 命令在 `web/` 目录下执行（即 `cd web` 后运行，或保持 cwd 为 `web`）。
- Go 代码用 Tab 缩进；本计划只涉及 TS/TSX，用项目既有缩进（2 空格，遵循 @antfu/eslint-config）。
- 每个任务结束提交一次，commit message 用中文 conventional 风格。

**文件结构（已锁定）:**

| 文件 | 职责 | 动作 |
|---|---|---|
| `web/src/theme/theme.ts` | 定义主题（启用 CSS 变量与 color schemes） | 改 |
| `web/src/main.tsx` | 应用挂载（注入防闪烁脚本） | 改 |
| `web/src/components/apps/ColorModeSelector.tsx` | 三态颜色模式切换器（读写 useColorScheme） | 新 |
| `web/src/components/apps/ColorModeSelector.test.tsx` | 组件单测（mock useColorScheme） | 新 |
| `web/src/components/apps/StylePanel.tsx` | 设置面板（顶部嵌入 ColorModeSelector） | 改 |

---

## Task 1: 改造 theme.ts 启用 CSS 变量与颜色模式

**Files:**
- Modify: `web/src/theme/theme.ts`

说明：这是基础配置任务。验证手段 = type-check 通过 + 现有测试不破坏（useColorScheme 是否真正启用，会在 Task 3 的组件测试中间接验证——若未启用，`mode` 恒为 `null`，组件测试失败）。

- [ ] **Step 1: 替换 `web/src/theme/theme.ts` 全文**

将文件改为：

```ts
import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
	cssVariables: {
		colorSchemeSelector: 'data',
	},
	colorSchemes: {
		light: true,
		dark: true,
	},
	palette: {
		primary: {
			main: '#1976d2',
		},
	},
	shape: {
		borderRadius: 8,
	},
	components: {
		MuiButton: {
			defaultProps: {
				variant: 'contained',
			},
			styleOverrides: {
				root: {
					textTransform: 'none',
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					borderRadius: 8,
				},
			},
		},
	},
})
```

变更要点：
- 移除写死的 `palette.mode: 'light'`（改由 `colorSchemes` 接管）。
- 移除矛盾的 `palette.background.default: '#121212'`（light/dark 各自由 MUI 默认调色板提供正确背景色）。
- 保留 `primary`、`shape.borderRadius`、`MuiButton`、`MuiCard` 自定义。
- 新增 `cssVariables: { colorSchemeSelector: 'data' }`（→ `<html data-mui-color-scheme="...">`；必须显式 `'data'`，默认 `'media'` 会使 `setMode` 失效）与 `colorSchemes`。
- **关键**：`defaultMode`/`modeStorageKey` **不**属于 `createTheme`（`cssVariables` 在 MUI 9.1.1 不接受它们），它们是 `<ThemeProvider>` 与 `<InitColorSchemeScript>` 的 props，见 Task 2。

- [ ] **Step 2: type-check**

Run: `npm run type-check`
Expected: 无错误退出（exit 0）。

- [ ] **Step 3: 跑现有测试，确认未破坏**

Run: `npm test`
Expected: 所有现有用例（`store/panel.test.ts`、`utils/*.test.ts` 等）通过。

- [ ] **Step 4: 提交**

```bash
git add web/src/theme/theme.ts
git commit -m "refactor(前端): theme 启用 CSS 变量与 light/dark 颜色模式" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: main.tsx 注入 InitColorSchemeScript 防首屏闪烁

**Files:**
- Modify: `web/src/main.tsx`

- [ ] **Step 1: 修改 `web/src/main.tsx`**

在 import 区新增（按现有字母顺序，`@mui/material` 相关一组）：

```ts
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
```

将 `ReactDOM.createRoot(...).render(...)` 的内容改为（在 `<React.StrictMode>` 内、`<ThemeProvider>` 之前插入 `InitColorSchemeScript`）：

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="system" modeStorageKey="homelab-color-mode" />
    <ThemeProvider theme={theme} defaultMode="system" modeStorageKey="homelab-color-mode">
      <CssBaseline />
      <NotifyProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </NotifyProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
```

其余 import 保持不变。要点：
- `defaultMode="system"` 与 `modeStorageKey="homelab-color-mode"` 同时放在 `<ThemeProvider>`（运行时 `useColorScheme().setMode` 读写 localStorage）与 `<InitColorSchemeScript>`（首屏防闪烁）上，两处必须一致。
- `InitColorSchemeScript` 的 `attribute="data-mui-color-scheme"` 与 Task 1 的 `colorSchemeSelector: 'data'` 对应（后者内部生成 `[data-mui-color-scheme="..."]` 选择器，`<html>` 上设同名属性）。

- [ ] **Step 2: type-check**

Run: `npm run type-check`
Expected: exit 0。

- [ ] **Step 3: 验证开发服务器正常启动（无运行时报错）**

Run: `npm run build`
Expected: 构建成功（`npm run build` 先跑 type-check 再 `vite build`）。若只需快速验证可用 `npm run dev` 后人工确认页面加载，但以 `build` 通过为准。

- [ ] **Step 4: 提交**

```bash
git add web/src/main.tsx
git commit -m "feat(前端): main 注入 InitColorSchemeScript 防颜色模式首屏闪烁" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: 新建 ColorModeSelector 组件（TDD）

**Files:**
- Modify: `web/src/test/setup.ts`（新增全局 cleanup，建立组件测试基础设施）
- Create: `web/src/components/apps/ColorModeSelector.tsx`
- Test: `web/src/components/apps/ColorModeSelector.test.tsx`

策略：用 `vi.mock` 把 `@mui/material/styles` 的 `useColorScheme` 替换为受控 mock，避免依赖 jsdom 缺失的 `matchMedia`，也避免 `mode` 在 ThemeProvider 下异步确定的时序问题。测试只验证组件自身的渲染与 `setMode` 调用契约，localStorage 写入是 MUI 的职责，不在本组件测试范围。

**测试基础设施（前置）**：项目 `web/src/test/setup.ts` 目前只引入 `@testing-library/jest-dom/vitest`，没有注册 @testing-library/react 的自动 cleanup，多个 `render` 之间 DOM 会累积。先在 `setup.ts` 加全局 `afterEach(cleanup)`，让所有组件测试在每个用例后自动清理 DOM（这是项目第一个组件测试，正好建立该标准）：

```ts
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import '@testing-library/jest-dom/vitest'

afterEach(() => {
  cleanup()
})
```

这样测试文件本身不需要手动 `afterEach(cleanup)`。

- [ ] **Step 1: 写失败测试 `web/src/components/apps/ColorModeSelector.test.tsx`**

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { setMode } = vi.hoisted(() => ({ setMode: vi.fn() }))

vi.mock('@mui/material/styles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material/styles')>()
  return {
    ...actual,
    useColorScheme: () => ({ mode: 'system', setMode }),
  }
})

import { ColorModeSelector } from '@/components/apps/ColorModeSelector'

describe('ColorModeSelector', () => {
  beforeEach(() => {
    setMode.mockReset()
  })

  it('渲染 跟随设备/亮色/暗色 三个按钮', () => {
    render(<ColorModeSelector />)
    expect(screen.getByRole('button', { name: '跟随设备' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '亮色' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '暗色' })).toBeInTheDocument()
  })

  it('点击亮色按钮调用 setMode("light")', () => {
    render(<ColorModeSelector />)
    fireEvent.click(screen.getByRole('button', { name: '亮色' }))
    expect(setMode).toHaveBeenCalledWith('light')
  })

  it('点击跟随设备按钮调用 setMode("system")', () => {
    render(<ColorModeSelector />)
    fireEvent.click(screen.getByRole('button', { name: '跟随设备' }))
    expect(setMode).toHaveBeenCalledWith('system')
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run src/components/apps/ColorModeSelector.test.tsx`
Expected: FAIL —— `Cannot find module '@/components/apps/ColorModeSelector'`（组件尚未创建）。

- [ ] **Step 3: 实现组件 `web/src/components/apps/ColorModeSelector.tsx`**

```tsx
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useColorScheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

export type ColorMode = 'system' | 'light' | 'dark'

const OPTIONS: { value: ColorMode, label: string, icon: ReactNode }[] = [
  { value: 'system', label: '跟随设备', icon: <SettingsBrightnessIcon /> },
  { value: 'light', label: '亮色', icon: <LightModeIcon /> },
  { value: 'dark', label: '暗色', icon: <DarkModeIcon /> },
]

export function ColorModeSelector() {
  const { mode, setMode } = useColorScheme()

  if (!mode) {
    return null
  }

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={mode}
      aria-label="颜色模式"
      onChange={(_, value: ColorMode | null) => {
        // exclusive 模式下点击已选中的按钮会得到 null，此时重新应用被点击的值，
        // 保证颜色模式三态切换器始终有一个明确选中项。
        setMode(value ?? mode)
      }}
    >
      {OPTIONS.map(opt => (
        <ToggleButton key={opt.value} value={opt.value} aria-label={opt.label}>
          {opt.icon}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
```

要点：`if (!mode) return null` 是 MUI 文档推荐的防御（`mode` 在未确定时为 `null`）；`exclusive` 单选；点击当前已选项时 `value` 为 `null`，此时 `setMode(value ?? mode)` 重新应用被点击的值（与当前 mode 相同，无害），保证三态切换器始终有一个明确选中项（点击必有反馈，符合 segmented control 直觉）。

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run src/components/apps/ColorModeSelector.test.tsx`
Expected: PASS（3 个用例全绿）。

- [ ] **Step 5: type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: 均无错误。（若 lint 对 `vi.mock` 与 `import` 顺序有告警，按 @antfu/eslint-config 提示调整，通常无需改动，vitest 会自动提升 `vi.mock`。）

- [ ] **Step 6: 提交**

```bash
git add web/src/components/apps/ColorModeSelector.tsx web/src/components/apps/ColorModeSelector.test.tsx
git commit -m "feat(前端): 新增 ColorModeSelector 三态颜色模式切换器" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: StylePanel 顶部嵌入颜色模式区块

**Files:**
- Modify: `web/src/components/apps/StylePanel.tsx`

颜色模式即时生效、不参与 `form`/`handleSave`，因此在 `StylePanel` 顶部设为独立区块，与下方需「保存」的字段用 `Divider` 视觉分隔，并用副标题说明其本地属性。

- [ ] **Step 1: 在 `web/src/components/apps/StylePanel.tsx` 顶部 import 区新增**

```tsx
import Divider from '@mui/material/Divider'
```

并在组件 import 区（`@/components/...` 一组）新增：

```tsx
import { ColorModeSelector } from '@/components/apps/ColorModeSelector'
```

- [ ] **Step 2: 在 `StylePanel` 返回的 `<Stack spacing={3}>` 内，作为第一个子元素插入颜色模式区块**

即紧跟 `<Stack spacing={3}>` 之后、现有的「面板标题/图标样式」那一行 `Stack` 之前插入：

```tsx
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>颜色模式</Typography>
        <ColorModeSelector />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          本地设备偏好，立即生效，不影响其他访客。
        </Typography>
      </Box>
      <Divider />
```

（`Box` 与 `Typography` 已在文件顶部 import，无需新增。）

- [ ] **Step 3: type-check + 全量测试 + lint**

Run: `npm run type-check && npm test && npm run lint`
Expected: type-check exit 0；所有测试通过；lint 无错误。

- [ ] **Step 4: 提交**

```bash
git add web/src/components/apps/StylePanel.tsx
git commit -m "feat(前端): 设置面板样式设置顶部嵌入颜色模式切换器" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: 端到端验证与完整构建

**Files:** 无（验证任务）

- [ ] **Step 1: 完整构建**

Run: `npm run build`
Expected: 构建成功（type-check + vite build 均通过）。

- [ ] **Step 2: 手动验证清单（启动 `npm run dev`，浏览器访问 `http://localhost:1002`）**

逐项确认：
1. 首次访问（清空 localStorage 的 `homelab-color-mode`）：UI 跟随系统当前亮/暗偏好。
2. 打开设置（右下角 Fab）→ 样式设置 Tab：顶部出现「颜色模式」区块，含三个图标按钮（跟随设备 / 亮色 / 暗色），当前模式高亮。
3. 点击「亮色」：整个面板立即变亮，无需点「保存」；刷新页面后仍为亮色。
4. 点击「暗色」：立即变暗；刷新后仍为暗色。
5. 点击「跟随设备」：切换系统深浅色，面板随之变化（MUI 内置 matchMedia 监听）。
6. 检查首屏无明显从亮→暗的闪烁。
7. 确认颜色模式切换**没有**触发面板配置保存（不调用 `setPanelConfig`，不影响其他访客）。

- [ ] **Step 3: 若 Step 2 全部通过，无需额外提交（本任务无代码改动）**

如发现回归，回到对应 Task 修复并补充测试后再提交。

---

## 完成标准

- `npm run type-check`、`npm test`、`npm run lint`、`npm run build` 全部通过。
- 三态切换、刷新保持、跟随系统、防闪烁均按 Task 5 清单验证通过。
- 颜色模式为纯本地偏好，未污染服务端 `panelConfig`。
- 共 4 次代码提交（Task 1–4 各一次）。
