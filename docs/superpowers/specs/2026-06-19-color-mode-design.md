# 前端颜色模式（亮/暗）支持设计

- 日期：2026-06-19
- 范围：`web/` 前端
- 目标：支持亮色/暗色颜色模式，默认跟随设备模式，设置面板可调节

## 背景

当前前端（React 19 + MUI 9 + Vite + Zustand）存在以下现状：

- `web/src/theme/theme.ts` 使用 `createTheme`，`palette.mode` 写死为 `'light'`，但顶层 `background.default` 又是 `#121212`（暗色背景，配合背景图遮罩），与 `mode:'light'` 自相矛盾。
- `web/src/main.tsx` 以 `<ThemeProvider theme={theme}>` 静态注入，**没有任何颜色模式切换逻辑**。
- 现有视觉设置（背景图、模糊、图标颜色等）通过 `usePanelStore().setPanelConfig` 持久化到**服务端**，所有访客共享同一份 `panelConfig`。
- 设置入口：首页右下角 Fab → `AppStarter` 对话框（多 Tab）→ `StylePanel`（样式设置）。

## 需求（已确认）

1. 前端支持亮色 / 暗色颜色模式。
2. 默认跟随设备模式（`prefers-color-scheme`）。
3. 设置面板可调节。
4. **存储作用域**：浏览器本地存储，每个访客/设备独立，不进服务端 `panelConfig`。
5. **模式粒度**：三态 —— 亮色 / 暗色 / 跟随设备，默认 `跟随设备`。
6. **实现方式**：使用 MUI 自身的主题能力（CSS 变量 + color schemes）。
7. **切换入口**：仅设置面板（`StylePanel`），不加页头/浮动快捷按钮。

## 架构概览

颜色模式管理完全交给 MUI，不引入额外 zustand store：

- 三态：`light` / `dark` / `system`，默认 `system`。
- localStorage key：`homelab-color-mode`（自定义 `modeStorageKey`）。
- DOM 应用方式：`<html data-mui-color-scheme="light|dark">`，`colorSchemeSelector: 'data'`。
- `system` 模式下，MUI 内置监听 `matchMedia('(prefers-color-scheme: dark)')`，系统主题变化时自动切换。
- 防首屏闪烁：`InitColorSchemeScript` 在 React 渲染前应用颜色方案。

> 注：MUI v6+ 起 `CssVarsProvider` 已被 `ThemeProvider` 取代。实际做法是给现有 `createTheme` 增加 `cssVariables` 与 `colorSchemes` 配置，`<ThemeProvider>` 保持不变，`useColorScheme()` 提供 `mode` / `setMode` / `systemMode`。

## 详细设计

### 1. 主题层 — `web/src/theme/theme.ts`

改造 `createTheme`：

- 增加 `cssVariables: { colorSchemeSelector: 'data' }`。
- 增加 `colorSchemes: { light: { palette: {...} }, dark: { palette: {...} } }`，light/dark 各自提供正确的 `background.default`（修复顶层 `#121212` 与 `mode:'light'` 的矛盾）。
- 保留现有自定义：`primary.main = '#1976d2'`、`shape.borderRadius = 8`、`MuiButton` / `MuiCard` 的 `styleOverrides`。
- 顶层不再写死 `palette.mode`（由 color schemes 接管）。
- 若 `styleOverrides` 中存在需要按模式区分的样式，使用 `theme.applyStyles('dark', { ... })`，避免切换闪烁。

### 2. 入口 — `web/src/main.tsx`

- 在根组件首子元素插入：
  ```tsx
  <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="system" modeStorageKey="homelab-color-mode" />
  ```
  位于 `<React.StrictMode>` 内、`<ThemeProvider>` 之前，确保在 React 渲染主体前同步设置颜色方案属性（MUI `'data'` 选择器模式下实际渲染为 `data-light` / `data-dark`）。
- `<ThemeProvider theme={theme} defaultMode="system" modeStorageKey="homelab-color-mode">`（增加 `defaultMode`/`modeStorageKey` props，与 `InitColorSchemeScript` 一致；`<CssBaseline />` 保留）。MUI 9.1.1 中 `defaultMode`/`modeStorageKey` 是 `ThemeProvider` 与 `InitColorSchemeScript` 的 props，**不**属于 `createTheme({ cssVariables })`。
- `InitColorSchemeScript` 从 `@mui/material/InitColorSchemeScript` 导入。

### 3. 颜色模式选择器 — `web/src/components/apps/ColorModeSelector.tsx`（新文件）

- 通过 `useColorScheme()` 读取 `mode`、调用 `setMode`。
- 三态 UI 使用 `ToggleButtonGroup`（三段式分段控件，分别配跟随设备 / 亮色 / 暗色图标），与下方 form 风格的 `Select`/`TextField` 视觉区分，强化其「即时生效控件」属性。
- `setMode('system' | 'light' | 'dark')` 即时生效，无保存动作。
- 纯展示+交互组件，可独立单测。

### 4. 设置面板集成 — `web/src/components/apps/StylePanel.tsx`

- 在 `StylePanel` 顶部新增「颜色模式」区块，嵌入 `ColorModeSelector`。
- 该区块用副标题/说明文字标注：「本地设备偏好，立即生效，不影响其他访客」。
- 与下方需「保存」的 `panelConfig` 字段视觉分隔（如 `Divider` 或独立 `Stack` 区块）。
- **不参与** `form` / `handleSave`：颜色模式直接调用 `setMode`，不写 `panelConfig`、不调 `setPanelConfig`。

## 数据流

设置面板选择模式 → `useColorScheme().setMode(mode)` → MUI 写入 localStorage（`homelab-color-mode`）并更新 `<html data-mui-color-scheme>` → CSS 变量切换 → 全局 UI 立即变色。

首屏：`InitColorSchemeScript` 在 React 渲染前读取 localStorage（无值时取系统 `prefers-color-scheme`），同步设置颜色方案属性（`data-light` / `data-dark`），消除从亮到暗的闪烁。

`system` 模式 + 系统主题变化：MUI 内置 `matchMedia` 监听器自动切换，无需额外代码。

## 关键交互说明

颜色模式是**本地偏好、即时生效**，与 `StylePanel` 中其他字段（进入 `form` → 点「保存」 → 写服务端 `panelConfig`）的流程**不同**。设计上将其作为 `StylePanel` 顶部的独立区块，明确标注本地属性，`setMode` 直接调用、不参与 `handleSave`。这样保持服务端配置（全访客共享）与本地偏好（个人/设备）的解耦。

## 顺带修复

- 移除 `theme.ts` 顶层 `palette.background.default = '#121212'` 与写死的 `palette.mode = 'light'`，改由 light/dark color schemes 提供各自正确的背景色与模式，消除现有矛盾。

## 测试策略

- **单测 `ColorModeSelector`**：mock `useColorScheme`，验证三态渲染与点击调用 `setMode` 传参正确。
- **`theme.ts` 校验**：验证 `colorSchemes.light` 与 `colorSchemes.dark` 均存在、`cssVariables` 已开启、`colorSchemeSelector === 'data'`。
- **手动 / E2E**：三态切换即时生效；刷新后保持选择；切换系统主题时 `system` 模式跟随；首屏无闪烁。

测试栈沿用项目既有：Vitest + Testing Library（`web/src/**/*.test.ts(x)`）。

## YAGNI 边界（明确不做）

- 不做服务端同步颜色模式（已确认本地存储）。
- 不加页头 / 浮动快捷切换按钮（已确认仅设置面板）。
- 不做多主题色定制（仅标准 light/dark 调色板 + 现有 `primary`）。
- 不引入新状态管理库或额外 zustand store（用 MUI 内置持久化）。

## 涉及文件清单

- 改：`web/src/theme/theme.ts`
- 改：`web/src/main.tsx`
- 改：`web/src/components/apps/StylePanel.tsx`
- 新：`web/src/components/apps/ColorModeSelector.tsx`
- 新（测试）：`web/src/components/apps/ColorModeSelector.test.tsx`

## 实现注意事项（已核实）

以下细节已在实现与浏览器端到端验证中确认：

- `defaultMode`/`modeStorageKey` 配置位置**已核实**（MUI 9.1.1）：它们是 `<ThemeProvider>` 与 `<InitColorSchemeScript>` 的 props，**不**属于 `createTheme({ cssVariables })`（后者只接受 `colorSchemeSelector`/`cssVarPrefix` 等）。`createTheme` 用 `cssVariables: { colorSchemeSelector: 'data' }`；该 `'data'` 模式实际生成 `[data-light]`/`[data-dark]` CSS 选择器并设同名 DOM 属性（`InitColorSchemeScript` 的 `attribute` 默认 `'data-mui-color-scheme'`，在此模式下被协调为 `data-{scheme}`）。已通过浏览器验证：三态切换、localStorage 持久化与首屏防闪烁均正常。
- `InitColorSchemeScript` 在纯 Vite CSR 中的放置方式（作为根组件首子元素）已验证可行，客户端首次挂载时同步执行，首屏无闪烁。
- `useColorScheme()` 返回 `{ mode, setMode, systemMode }`（`mode` 可能为 `null`，组件用 `if (!mode) return null` 防御），已在 `ColorModeSelector` 中使用并通过单测覆盖。
