# Custom Favicon Design

Date: 2026-06-21

## Summary

Allow users to set a custom website favicon through the settings panel. Two input modes: upload a local image with drag-to-crop square editing, or paste an external URL. The cropped image is uploaded to the file management system, and its URL is stored in `panelConfig.faviconSrc`. If the uploaded file is later deleted from file management, the next page load detects the 404 and the favicon reverts to the default `/favicon.svg`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Input modes | Upload-and-crop **and** paste external URL | User confirmed both modes are wanted |
| Crop library | `react-easy-crop` (~10 KB, TS support) | Mature, drag/zoom/export out of the box, least code |
| Deletion fallback | Frontend HEAD validation on load | Backend physically deletes files (`os.Remove`), so `/uploads/xxx` truly 404s — no backend change needed |
| External URL entry | "远程图标" button → dialog (not an always-visible URL field) | Keeps the section uncluttered; casual users don't see a raw URL input |
| URL safety | Protocol allowlist in `sanitizeFaviconSrc` | `faviconSrc` reaches `<link href>` / `<img src>` / `fetch()` — only `http(s)://`, `/uploads/`, `data:image/` allowed |

## UI Design

### Settings Panel Location

The favicon setting lives inside **页面设置 (Page Settings) > 页面布局 (Page Layout)**, directly below the "面板标题" (Panel Title) field. A new "网站图标 (Favicon)" section contains:

- **Current favicon preview**: a 32×32 icon box showing the current favicon (default or custom)
- **Upload button**: "上传图片" — opens the crop editor dialog
- **Remote button**: "远程图标" — opens the remote-URL dialog (replaces an always-visible URL text field, which cluttered the section)
- **Remove button**: "移除自定义图标" — clears `faviconSrc`, reverts to default

### Crop Editor Dialog

A modal dialog titled "裁剪图标" with:

- **Image canvas**: displays the uploaded image with a draggable/zoomable square crop area
- **Crop area**: square aspect (`aspect={1}`) enforced
- **Zoom slider**: 1×–3× zoom control
- **Action buttons**: "取消" (Cancel) and "确认裁剪" (Confirm Crop)

### Remote Favicon Dialog

A modal dialog titled "远程图标地址" with:

- **URL field**: single text input (placeholder `https://example.com/favicon.ico`), auto-focused, pre-filled with the current `faviconSrc` on open
- **Action buttons**: "取消" (Cancel) and "确定" (Confirm) — confirm writes the trimmed URL into `faviconSrc`

## Data Model

### New `PanelConfig` field

```typescript
export interface PanelConfig {
    // ... existing fields ...
    faviconSrc?: string // custom favicon URL (from file upload or external link)
}
```

- `undefined` / empty → use default `/favicon.svg`
- `/uploads/xxx.png` → uploaded via file management
- `https://...` → external URL
- `data:image/...` → inline base64 (allowed by the sanitizer)

### No backend model changes

The backend stores `Panel.Config` as `json.RawMessage`, so the new `favicon_src` key passes through transparently. No Go struct changes, no migration.

### Store plumbing

`web/src/store/panel.ts`:
- Add `faviconSrc` to `sanitizePanelConfig` via a `sanitizeFaviconSrc` helper, so it is preserved on load/save and reset to `undefined` on `resetPanelConfig`.
- `sanitizeFaviconSrc` enforces a **protocol allowlist** — only `http(s)://`, `/uploads/`, and `data:image/` are kept; anything else (e.g. `javascript:`, `file:`) is dropped to `undefined`. This guards every consumer, since `faviconSrc` flows into `<link href>`, `<img src>`, and `fetch()`.
- `setPanelConfig` already runs through the sanitizer, so no other change is needed.

## Data Flow

```
Upload path:
  User selects image → Crop dialog opens → User crops to square → Canvas exports PNG Blob
  → uploadImg(blob) → POST /api/v1/files → returns /uploads/xxx.png
  → patch({ faviconSrc: url }) → handleSave() → PUT /api/v1/panel

URL path:
  User clicks "远程图标" → remote dialog opens → user enters URL → 确认 confirms
  → patch({ faviconSrc: url }) → handleSave() → PUT /api/v1/panel

Runtime (App root):
  App loads → read panelConfig.faviconSrc from Zustand store
  → If empty/undefined → <link rel="icon" href="/favicon.svg">
  → If /uploads/ path → set href, then probe existence via a HEAD/fetch
       → if 404 → clear faviconSrc (PUT /api/v1/panel) and revert to /favicon.svg
  → If https://... → set href directly (no probe)

File deletion:
  User deletes the file in FileManager → file physically removed (os.Remove)
  → Next page load's probe returns 404 → faviconSrc cleared → default restored
```

## Frontend Implementation

### New dependency

`react-easy-crop` — lightweight cropping library with TypeScript support.

### Components

1. **FaviconSettingSection** (new block inside `PageSettingsPanel`, `web/src/components/apps/SettingsPanels.tsx`):
   - Renders favicon preview, URL input, upload button, remove button.
   - Wires into the existing `useSettingsForm()` `patch()` / `handleSave()` flow (same pattern as 面板标题).

2. **FaviconCropDialog** (new file `web/src/components/apps/FaviconCropDialog.tsx`):
   - Uses `react-easy-crop` with `aspect={1}` (square) for the cropping interaction.
   - Canvas-based export of the cropped region as a PNG `Blob` (fixed output, e.g. 128×128, for crisp rendering at all sizes).
   - Calls `uploadImg()` from `web/src/api/files.ts` to persist the crop result.
   - Returns the uploaded file URL via callback, which the section feeds into `patch({ faviconSrc })`.

3. **Dynamic favicon updater** (effect in App root component):
   - Watches `panelConfig.faviconSrc` from the Zustand store.
   - Updates `<link rel="icon">` (and clears stale cached variants) on change.
   - On mount / when the value is an `/uploads/` URL, probes existence; on 404, calls `setPanelConfig` to clear the field (persists the cleanup) and reverts the link to default.

### User feedback

After a successful save that changed `faviconSrc`, show a Snackbar: "网站图标已保存，刷新页面以查看效果".

## Backend Changes

None. The feature reuses existing endpoints:

- `POST /api/v1/files` (`UploadFiles`) for image upload
- `DELETE /api/v1/files/:id` (`DeleteFile`) for file deletion — physically removes the file via `os.Remove`
- `PUT /api/v1/panel` for config persistence
- `GET /uploads/*filepath` (`Upload`) for public file serving

`Panel.Config` is `json.RawMessage` in Go, so the new `favicon_src` key requires no struct changes.

## Edge Cases

| Scenario | Behavior |
|---|---|
| Custom favicon file deleted from file management | Next page load's probe returns 404, `faviconSrc` cleared and persisted, default restored |
| External URL becomes unreachable | Browser shows broken icon (acceptable — user chose an external URL; no probe for `https://`) |
| User uploads non-square image | Crop editor enforces `aspect={1}` square |
| User clears URL input and doesn't upload | Saves empty string → sanitizer drops it → reverts to default |
| Panel config reset | `faviconSrc` resets to `undefined`, default favicon restored |
| Probe false-positive (transient network error) | Probe only acts on a definitive 404; other failures leave the value untouched |

## Files Changed

| File | Change |
|---|---|
| `web/src/types/panel.ts` | Add `faviconSrc` to `PanelConfig` |
| `web/src/store/panel.ts` | Add `faviconSrc` to `sanitizePanelConfig` |
| `web/src/components/apps/SettingsPanels.tsx` | Add `FaviconSettingSection` to `PageSettingsPanel` |
| `web/src/components/apps/FaviconCropDialog.tsx` | New file — crop editor dialog |
| `web/src/App.tsx` (or equivalent root) | Add dynamic favicon updater effect + existence probe |
| `web/package.json` | Add `react-easy-crop` dependency |

## Validation

- `cd web && npm run lint`
- `cd web && npm run build`
- `git diff --check`
- Manual: set favicon via upload (crop) and via URL, delete the uploaded file in FileManager and reload, confirm default returns.
