# Custom Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set a custom website favicon (upload-and-crop or paste URL) stored in `panelConfig.faviconSrc`, applied live via a dynamic `<link rel="icon">` updater, with automatic fallback to `/favicon.svg` when the uploaded file is deleted.

**Architecture:** Pure-frontend feature. The crop editor (`react-easy-crop`) exports a 128×128 PNG blob, uploaded via the existing `POST /api/v1/files` and stored as a URL in `panelConfig.faviconSrc`. A `useFavicon` hook in the app root watches the store, updates `<link rel="icon">`, and probes `/uploads/` URLs — on 404 it clears and persists `faviconSrc`. Backend `Panel.Config` is `json.RawMessage`, so the new field passes through with zero backend changes.

**Tech Stack:** React + MUI + Zustand + Vite + Vitest, `react-easy-crop@^6`.

**Commit policy:** Per project `CLAUDE.md`, do **not** commit/stage/push unless the user explicitly asks. The "Commit" steps below are checkpoints — run the verification, then leave the change in the working tree unless told otherwise.

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `web/src/types/panel.ts` | Add `faviconSrc?: string` to `PanelConfig` | Modify |
| `web/src/store/panel.ts` | Add `faviconSrc` to `defaultPanelConfig` + `sanitizePanelConfig` | Modify |
| `web/src/store/panel.test.ts` | Unit tests for `faviconSrc` sanitization | Modify |
| `web/package.json` | Add `react-easy-crop` dependency | Modify |
| `web/src/utils/faviconCrop.ts` | `getCroppedImgBlob()` — canvas export of cropped square to PNG Blob (new) | Create |
| `web/src/components/apps/FaviconCropDialog.tsx` | Crop editor modal (new) | Create |
| `web/src/components/apps/SettingsPanels.tsx` | `FaviconSettingSection` + integrate into `PageSettingsPanel` + save-toast tweak | Modify |
| `web/src/hooks/useFavicon.ts` | Dynamic favicon updater + `/uploads/` 404 probe (new) | Create |
| `web/src/App.tsx` | Call `useFavicon()` in the root component | Modify |

**Untested by automation, verified manually:** canvas export (`faviconCrop.ts`), crop dialog, dynamic link updater, and the 404 probe — all are DOM/`fetch`/`<canvas>` interactions that jsdom does not faithfully exercise. The pure-function sanitization IS unit-tested.

---

## Task 1: Data model + store sanitization (TDD)

**Files:**
- Modify: `web/src/types/panel.ts` (the `PanelConfig` interface, ~line 27)
- Modify: `web/src/store/panel.ts:24` (`defaultPanelConfig`) and `web/src/store/panel.ts:75` (`sanitizePanelConfig`)
- Test: `web/src/store/panel.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this import at the top of `web/src/store/panel.test.ts` (alongside the existing `@/types/panel` import):

```typescript
import { defaultPanelConfig, sanitizePanelConfig } from '@/store/panel'
```

Append a new `describe` block at the end of the file (after the closing `})` of the existing `describe('panel store', ...)`):

```typescript
describe('sanitizePanelConfig faviconSrc', () => {
    it('defaults to undefined', () => {
        expect(defaultPanelConfig().faviconSrc).toBeUndefined()
        expect(sanitizePanelConfig({}).faviconSrc).toBeUndefined()
    })

    it('keeps a valid favicon source', () => {
        expect(sanitizePanelConfig({ faviconSrc: '/uploads/a.png' }).faviconSrc).toBe(
            '/uploads/a.png',
        )
        expect(sanitizePanelConfig({ faviconSrc: 'https://e.com/i.ico' }).faviconSrc).toBe(
            'https://e.com/i.ico',
        )
    })

    it('treats empty / whitespace as undefined', () => {
        expect(sanitizePanelConfig({ faviconSrc: '' }).faviconSrc).toBeUndefined()
        expect(sanitizePanelConfig({ faviconSrc: '   ' }).faviconSrc).toBeUndefined()
    })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run src/store/panel.test.ts`
Expected: FAIL — `sanitizePanelConfig({...}).faviconSrc` is `undefined` even for valid input (the field is currently dropped by the explicit field map), and TypeScript may error on the unknown `faviconSrc` key.

- [ ] **Step 3: Add `faviconSrc` to `PanelConfig`**

In `web/src/types/panel.ts`, add the field to the `PanelConfig` interface (after `appCardDefaultColor?: string`):

```typescript
export interface PanelConfig {
    backgroundImageSrc?: string
    backgroundBlur?: number
    backgroundMaskNumber?: number
    iconTextInfoShowDescription?: boolean
    logoText?: string
    clockShow?: boolean
    clockShowSecond?: boolean
    searchBoxShow?: boolean
    marginTop?: number
    marginBottom?: number
    marginX?: number
    appCardRadius?: number
    appCardAspectRatio?: string
    appCardDefaultColor?: string
    faviconSrc?: string
}
```

- [ ] **Step 4: Add `faviconSrc` to `defaultPanelConfig`**

In `web/src/store/panel.ts`, add the field inside `defaultPanelConfig()`'s returned object (after `appCardDefaultColor: defaultAppCardColor,`):

```typescript
export function defaultPanelConfig(): PanelConfig {
    return {
        backgroundImageSrc: backgroundMd,
        backgroundBlur: 0,
        backgroundMaskNumber: 0,
        iconTextInfoShowDescription: false,
        logoText: 'Homelab Panel',
        clockShow: true,
        clockShowSecond: false,
        searchBoxShow: true,
        marginBottom: 2,
        marginTop: 3,
        marginX: 5,
        appCardRadius: 20,
        appCardAspectRatio: 'auto',
        appCardDefaultColor: defaultAppCardColor,
        faviconSrc: undefined,
    }
}
```

- [ ] **Step 5: Add `faviconSrc` to `sanitizePanelConfig`**

In `web/src/store/panel.ts`, the `sanitizePanelConfig` return object is an explicit field map. Add the final line (after `appCardDefaultColor: sanitizeHexColor(...)`):

```typescript
        appCardDefaultColor: sanitizeHexColor(
            config.appCardDefaultColor,
            defaults.appCardDefaultColor,
        ),
        faviconSrc: config.faviconSrc?.trim() || undefined,
    }
}
```

(`config.faviconSrc?.trim() || undefined` normalizes empty/whitespace to `undefined`; a real URL survives unchanged.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd web && npx vitest run src/store/panel.test.ts`
Expected: PASS — all three new `faviconSrc` cases pass.

- [ ] **Step 7: Lint**

Run: `cd web && npm run lint`
Expected: no errors.

- [ ] **Step 8: Commit checkpoint**

```bash
git add web/src/types/panel.ts web/src/store/panel.ts web/src/store/panel.test.ts
git commit -m "feat(web): add faviconSrc to panel config with sanitization"
```
(Per project policy, only commit if the user asked — otherwise leave staged/unstaged in the working tree.)

---

## Task 2: Install `react-easy-crop`

**Files:**
- Modify: `web/package.json`, `web/package-lock.json`

- [ ] **Step 1: Install the dependency**

Run: `cd web && npm install react-easy-crop`
Expected: `react-easy-crop@^6.0.2` added to `dependencies`, lockfile updated.

- [ ] **Step 2: Verify it resolves**

Run: `cd web && node -e "console.log(require('react-easy-crop/package.json').version)"`
Expected: prints `6.x.y`.

- [ ] **Step 3: Commit checkpoint**

```bash
git add web/package.json web/package-lock.json
git commit -m "chore(web): add react-easy-crop dependency"
```

---

## Task 3: Cropped-image export utility

**Files:**
- Create: `web/src/utils/faviconCrop.ts`

This is a `<canvas>`-only helper (no React). jsdom cannot run `toBlob`/`drawImage`, so there is no unit test — it is exercised through the manual end-to-end check in Task 7.

- [ ] **Step 1: Create the utility**

Create `web/src/utils/faviconCrop.ts`:

```typescript
import { type Area } from 'react-easy-crop'

// Favicon export is rendered to a fixed square so it stays crisp at 16/32/48 px.
const FAVICON_OUTPUT_SIZE = 128

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.src = url
    })
}

/**
 * Crop the source image to the given pixel area and export a 128×128 PNG Blob.
 * Returns null if a 2D canvas context is unavailable.
 */
export async function getCroppedImgBlob(
    imageSrc: string,
    pixelCrop: Area,
): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    canvas.width = FAVICON_OUTPUT_SIZE
    canvas.height = FAVICON_OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        FAVICON_OUTPUT_SIZE,
        FAVICON_OUTPUT_SIZE,
    )

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
}
```

- [ ] **Step 2: Type-check + lint**

Run: `cd web && npm run lint && npm run type-check`
Expected: no errors (`Area` type resolves from `react-easy-crop`).

- [ ] **Step 3: Commit checkpoint**

```bash
git add web/src/utils/faviconCrop.ts
git commit -m "feat(web): add favicon crop canvas export utility"
```

---

## Task 4: Crop editor dialog

**Files:**
- Create: `web/src/components/apps/FaviconCropDialog.tsx`

- [ ] **Step 1: Create the dialog component**

Create `web/src/components/apps/FaviconCropDialog.tsx`:

```tsx
import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { uploadImg } from '@/api/files'
import { useNotify } from '@/components/common/NotifyProvider'
import { getCroppedImgBlob } from '@/utils/faviconCrop'

interface FaviconCropDialogProps {
    imageSrc: string
    onCancel: () => void
    onConfirm: (uploadedUrl: string) => void
}

export function FaviconCropDialog({ imageSrc, onCancel, onConfirm }: FaviconCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [uploading, setUploading] = useState(false)
    const notify = useNotify()

    const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels)
    }, [])

    async function handleConfirm() {
        if (!croppedAreaPixels) return
        setUploading(true)
        try {
            const blob = await getCroppedImgBlob(imageSrc, croppedAreaPixels)
            if (!blob) {
                notify.error('裁剪失败')
                return
            }
            const file = new File([blob], 'favicon.png', { type: 'image/png' })
            const res = await uploadImg(file)
            if (res.code !== 0 || !res.data?.imageUrl) {
                notify.error(`上传失败:${res.msg}`)
                return
            }
            onConfirm(res.data.imageUrl)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>裁剪图标</DialogTitle>
            <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: 300,
                        bgcolor: 'common.black',
                    }}
                >
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </Box>
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        缩放
                    </Typography>
                    <Slider
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(_, value) => setZoom(value as number)}
                    />
                </Box>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel} disabled={uploading}>
                        取消
                    </Button>
                    <Button
                        variant="contained"
                        loading={uploading}
                        onClick={handleConfirm}
                    >
                        确认裁剪
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `cd web && npm run lint && npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit checkpoint**

```bash
git add web/src/components/apps/FaviconCropDialog.tsx
git commit -m "feat(web): add favicon crop dialog component"
```

---

## Task 5: Settings section + save toast

**Files:**
- Modify: `web/src/components/apps/SettingsPanels.tsx` — add `FaviconSettingSection`, insert it into `PageSettingsPanel`, and tweak `useSettingsForm` so a changed favicon shows the "refresh to see effect" toast.

- [ ] **Step 1: Add `FaviconSettingSection` to `SettingsPanels.tsx`**

Insert this new component just above `function useSettingsForm()` (around line 152). It uses icons (`CloudUploadIcon`) already imported at the top of the file.

```tsx
interface FaviconSettingSectionProps {
    value: string | undefined
    onPatch: (src: string) => void
    onClear: () => void
}

function FaviconSettingSection({ value, onPatch, onClear }: FaviconSettingSectionProps) {
    const [cropOpen, setCropOpen] = useState(false)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const previewSrc = value?.trim() ? value : '/favicon.svg'

    function handleFile(file: File) {
        const reader = new FileReader()
        reader.onload = () => {
            setImageSrc(reader.result as string)
            setCropOpen(true)
        }
        reader.readAsDataURL(file)
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                网站图标
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Box
                    component="img"
                    src={previewSrc}
                    alt="favicon"
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        bgcolor: 'background.paper',
                        objectFit: 'contain',
                    }}
                />
                <Button
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    variant="outlined"
                >
                    上传图片
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) handleFile(file)
                            event.target.value = ''
                        }}
                    />
                </Button>
                {value?.trim() && (
                    <Button onClick={onClear} color="error">
                        移除自定义图标
                    </Button>
                )}
            </Stack>
            <TextField
                label="图标 URL"
                placeholder="https://example.com/favicon.ico"
                value={value ?? ''}
                onChange={(event) => onPatch(event.target.value)}
                fullWidth
                sx={{ mt: 2 }}
            />
            {cropOpen && imageSrc && (
                <FaviconCropDialog
                    imageSrc={imageSrc}
                    onCancel={() => {
                        setCropOpen(false)
                        setImageSrc(null)
                    }}
                    onConfirm={(url) => {
                        onPatch(url)
                        setCropOpen(false)
                        setImageSrc(null)
                    }}
                />
            )}
        </Box>
    )
}
```

`FaviconCropDialog` must be imported — add to the import block at the top of `SettingsPanels.tsx`:

```tsx
import { FaviconCropDialog } from './FaviconCropDialog'
```

- [ ] **Step 2: Insert the section into `PageSettingsPanel`**

In `PageSettingsPanel` (the `Section title="页面布局"` block), insert the section directly after the "面板标题" `TextField` and before the "页面背景" `Box`. Locate the title field:

```tsx
<Section title="页面布局">
    <TextField
        label="面板标题"
        value={form.logoText ?? ''}
        onChange={(event) => patch({ logoText: event.target.value })}
        fullWidth
    />

    {/* ↓↓↓ insert this block ↓↓↓ */}
    <FaviconSettingSection
        value={form.faviconSrc}
        onPatch={(src) => patch({ faviconSrc: src })}
        onClear={() => patch({ faviconSrc: '' })}
    />
    {/* ↑↑↑ end insert ↑↑↑ */}

    <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            页面背景
            ...
```

- [ ] **Step 3: Tweak `useSettingsForm` for the refresh toast**

`useRef` is already imported at the top of `SettingsPanels.tsx` (`import { useEffect, useRef, useState, type ReactNode } from 'react'`). Replace the body of `useSettingsForm()` (around lines 152–174) with:

```tsx
function useSettingsForm() {
    const panelConfig = usePanelStore((s) => s.panelConfig)
    const setPanelConfig = usePanelStore((s) => s.setPanelConfig)
    const [form, setForm] = useState<PanelConfig>(() => normalizeForm(panelConfig))
    const { loading: saving, run } = useApiAction()
    const initialFaviconRef = useRef(panelConfig.faviconSrc)

    useEffect(() => {
        setForm(normalizeForm(panelConfig))
    }, [panelConfig])

    function patch(partial: Partial<PanelConfig>) {
        setForm((prev) => ({ ...prev, ...partial }))
    }

    async function handleSave() {
        const faviconChanged = initialFaviconRef.current !== form.faviconSrc
        await run(async () => setPanelConfig(form), {
            successMessage: faviconChanged
                ? '网站图标已保存，刷新页面以查看效果'
                : t('common.saveSuccess'),
            errorMessage: (response) => `${t('common.saveFail')}:${response.msg}`,
        })
        if (faviconChanged) {
            initialFaviconRef.current = form.faviconSrc
        }
    }

    return { form, patch, handleSave, saving }
}
```

Why this is safe for `AppSettingsPanel` (which also calls `useSettingsForm` but exposes no favicon control): its `form.faviconSrc` always equals `panelConfig.faviconSrc` (never edited), so `faviconChanged` is always `false` there and the normal "保存成功" toast is used.

- [ ] **Step 4: Type-check + lint + build**

Run: `cd web && npm run lint && npm run build`
Expected: clean lint, successful production build.

- [ ] **Step 5: Commit checkpoint**

```bash
git add web/src/components/apps/SettingsPanels.tsx
git commit -m "feat(web): add favicon setting section with refresh-on-save toast"
```

---

## Task 6: Dynamic favicon updater + 404 fallback

**Files:**
- Create: `web/src/hooks/useFavicon.ts`
- Modify: `web/src/App.tsx`

- [ ] **Step 1: Create the `useFavicon` hook**

Create `web/src/hooks/useFavicon.ts`:

```typescript
import { useEffect } from 'react'

import { usePanelStore } from '@/store/panel'

const DEFAULT_FAVICON = '/favicon.svg'

function faviconTypeFor(href: string): string {
    if (href.endsWith('.svg')) return 'image/svg+xml'
    if (href.endsWith('.png')) return 'image/png'
    if (href.endsWith('.ico')) return 'image/x-icon'
    return ''
}

/**
 * Keep <link rel="icon"> in sync with panelConfig.faviconSrc.
 *
 * - empty/undefined → default /favicon.svg
 * - /uploads/ path  → set href, then probe existence; on a definitive 404
 *                     (file deleted from the file manager) clear + persist
 *                     faviconSrc and revert to the default.
 * - https://...     → set href directly (no probe; external reachability is
 *                     the user's responsibility)
 */
export function useFavicon() {
    const faviconSrc = usePanelStore((s) => s.panelConfig.faviconSrc)

    useEffect(() => {
        const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
        if (!link) return

        const custom = faviconSrc?.trim()
        const href = custom ? custom : DEFAULT_FAVICON
        link.href = href

        const type = faviconTypeFor(href)
        if (type) link.type = type
        else link.removeAttribute('type')

        if (!custom || !custom.startsWith('/uploads/')) return

        let cancelled = false
        // cache: 'no-cache' so a file deleted after first load is actually seen as 404
        fetch(custom, { method: 'GET', cache: 'no-cache' })
            .then((res) => {
                if (cancelled) return
                if (res.status === 404) {
                    const store = usePanelStore.getState()
                    store.setPanelConfig({ ...store.panelConfig, faviconSrc: undefined })
                }
            })
            .catch(() => {
                // transient network failure — leave the favicon as-is
            })

        return () => {
            cancelled = true
        }
    }, [faviconSrc])
}
```

- [ ] **Step 2: Wire the hook into the app root**

Replace the contents of `web/src/App.tsx`:

```tsx
import { useFavicon } from './hooks/useFavicon'
import { AppRouter } from './router/AppRouter'

export default function App() {
    useFavicon()
    return <AppRouter />
}
```

- [ ] **Step 3: Type-check + lint + build**

Run: `cd web && npm run lint && npm run build`
Expected: clean lint, successful build.

- [ ] **Step 4: Commit checkpoint**

```bash
git add web/src/hooks/useFavicon.ts web/src/App.tsx
git commit -m "feat(web): apply custom favicon dynamically with delete-fallback"
```

---

## Task 7: End-to-end verification

- [ ] **Step 1: Full frontend validation**

Run: `cd web && npm run lint && npm run type-check && npm run build && npx vitest run`
Expected: clean lint, passing type-check, successful build, all unit tests pass.

- [ ] **Step 2: Build the embedded binary**

Run (from repo root): `make web && CGO_ENABLED=0 go build -o /tmp/homelab-panel-favicon -ldflags "-s -w" .`
Expected: build succeeds (embeds the new `web/dist`).

- [ ] **Step 3: Whitespace check**

Run: `git diff --check`
Expected: no trailing-whitespace / mix-indent warnings.

- [ ] **Step 4: Manual verification (only if the user asks to run the app)**

Run the binary: `/tmp/homelab-panel-favicon serve`, log in, open **设置 → 页面设置 → 页面布局**. Confirm each path:

1. **Upload + crop**: click 上传图片 → pick a non-square image → drag/zoom → 确认裁剪 → preview updates → click 保存 → toast says "网站图标已保存，刷新页面以查看效果" → reload → browser tab icon is the cropped image.
2. **URL paste**: type `https://github.githubassets.com/favicons/favicon.svg` into 图标 URL → 保存 → reload → tab icon is the external image.
3. **Delete fallback**: open 文件管理 → delete the uploaded favicon file → reload the page → tab icon reverts to the default `/favicon.svg`, and the 图标 URL field is cleared in settings.
4. **Remove button**: click 移除自定义图标 → 保存 → reload → default favicon.
5. **Unrelated save**: change only 背景模糊 → 保存 → toast is the normal "保存成功" (not the refresh message).

- [ ] **Step 5: Final commit (if requested)**

Only when the user explicitly approves committing:

```bash
git status --short   # confirm scope
git add -A
git commit -m "feat(web): custom website favicon with crop editor and delete-fallback"
```

---

## Self-Review

**Spec coverage:**
- ✅ Settings location (页面设置 → 页面布局, below 面板标题) — Task 5 Step 2
- ✅ Preview + URL input + upload button + remove button — `FaviconSettingSection` (Task 5)
- ✅ Crop dialog with square aspect, zoom, confirm/cancel — Task 4
- ✅ `react-easy-crop` dependency — Task 2
- ✅ Canvas PNG export → `uploadImg()` → `POST /files` → `faviconSrc` — `FaviconCropDialog` + `faviconCrop.ts`
- ✅ Dynamic `<link rel="icon">` updater — Task 6
- ✅ `/uploads/` 404 probe → clear + persist + revert default — `useFavicon` (Task 6)
- ✅ "Refresh to see effect" toast on changed-favicon save — `useSettingsForm` (Task 5 Step 3)
- ✅ `PanelConfig.faviconSrc` + sanitizer + defaults — Task 1
- ✅ Edge cases (non-square enforced by `aspect={1}`, empty→default, reset→default, transient probe error ignored) — Tasks 1, 4, 6

**Placeholder scan:** none — every step carries its full code or exact command.

**Type consistency:**
- `PanelConfig.faviconSrc?: string` (Task 1) → read in `FaviconSettingSection.value` / `useSettingsForm` / `useFavicon` ✅
- `getCroppedImgBlob(imageSrc: string, pixelCrop: Area): Promise<Blob | null>` (Task 3) → called in `FaviconCropDialog` (Task 4) ✅
- `FaviconCropDialogProps { imageSrc, onCancel, onConfirm }` (Task 4) → instantiated in `FaviconSettingSection` (Task 5) ✅
- `uploadImg(file)` returns `{ code, data: { imageUrl } }` (per `web/src/api/files.ts`) → consumed as `res.data.imageUrl` (Task 4) ✅
- `useFavicon()` (Task 6) → called in `App` (Task 6 Step 2) ✅
