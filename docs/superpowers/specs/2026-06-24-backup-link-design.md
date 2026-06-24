# App Backup Link Design

Date: 2026-06-24

## Summary

Add an optional per-app **backup link** (`backup_url`) so that, in **browse mode**, right-clicking an app card opens the backup link in a new tab (the primary link still opens on a normal left-click). If an app has no backup link, the right-click shows a top-centered info notification "此应用无备用链接". The field threads through the data store, the REST panel API, the MCP tools, and the frontend edit form. Search (both server-side `search_apps` and the client-side Home search box) matches the backup link so apps can be found by it, but the lightweight `AppSummary` returned by list/search does **not** carry the field — the full value is only in `AppDetail` (`get_app`).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Field shape | Single optional `backup_url` string | User: "one optional field" |
| Right-click scope | **Browse mode only**; edit mode unchanged | User: in browse mode all users behave the same; edit-mode operations are unaffected. The existing admin edit/copy/delete menu stays. |
| Right-click action | Open backup link in a **new tab** (`window.open`); if empty, `notify.info('此应用无备用链接')` | Consistent with the primary link's `openPage`; matches user request. Snackbar is already top-centered. |
| Search matching | `matchesApp` includes `backup_url`; client-side Home search also matches `backupUrl` | User: "search must include the backup link" |
| `AppSummary` shape | Does **not** carry `backup_url` (stays minimal) | User: AppSummary does not need it; use `get_app` for the full value |
| Validation | Optional; if non-empty, length ≤ 2048 (`maxAppURL`). Frontend normalizes + `isValidUrl`; backend enforces length only | Parity with how the primary `url` is handled (backend checks non-empty + length, no scheme enforcement) |
| Notify severity | `notify.info` | Informational "nothing to open" message; user-confirmed |

## Behavior Design

The Home page has two effective modes derived from `canManage = loggedInAsAdmin && !browsingAsGuest`:

- **Browse mode** (`!canManage` — site visitors, or an admin who toggled "browse as guest"):
  - **Left-click** app card → opens primary `url` in a new tab (existing `handleItemClick` → `openPage`).
  - **Right-click** app card → opens `backup_url` in a new tab; if empty, `notify.info('此应用无备用链接')`. **(new)**
- **Edit mode** (`canManage`):
  - All existing behavior unchanged — single-click (delayed) navigates, double-click edits, **right-click opens the edit/copy/delete context menu** (unchanged).

Sorting mode (`sortStatus` active): right-click remains a no-op, identical to today.

The browser's native context menu is suppressed (`event.preventDefault()`) on card right-click in browse mode so the gesture reliably triggers the backup link. In edit mode the existing `preventDefault` + menu behavior is preserved.

## Data Model

### `internal/data/models.go`

Add a field to `Item`:

```go
type Item struct {
    // ... existing fields ...
    BackupURL string `json:"backup_url,omitempty"`
}
```

`panelView` serializes `data.Item` directly, so `backup_url` is returned by `GET /api/v1/panel` with no view change.

### `internal/handlers/panel.go`

- `itemInput`: add `BackupURL string \`json:"backup_url"\``.
- `normalizePanel`: when constructing each `data.Item`, set `BackupURL: it.BackupURL`.

### `internal/panel/types.go`

Add `BackupURL` to the panel-layer types (not to `AppSummary`):

```go
type AppDetail struct {
    // ... existing fields ...
    BackupURL string `json:"backup_url,omitempty"`
}

type AppInput struct {
    // ... existing fields ...
    BackupURL string
}

type AppPatch struct {
    // ... existing fields (pointer semantics: nil=skip, ""=clear) ...
    BackupURL *string
}
```

`AppSummary` is intentionally left unchanged (no `backup_url`).

### `internal/panel/validate.go`

- `validateAppInput`: if `in.BackupURL != ""`, enforce `runeLen ≤ maxAppURL` (mirror the primary `URL` length check, minus the required-non-empty rule).
- `validateAppPatch`: if `p.BackupURL != nil` and `*p.BackupURL != ""`, enforce the same length bound.

### `internal/panel/service.go`

- `matchesApp`: also match the regex against `it.BackupURL` (non-empty):
  ```go
  if it.BackupURL != "" && re.MatchString(it.BackupURL) {
      return true
  }
  ```
- `toAppDetail`: map `BackupURL: it.BackupURL`.
- `CreateApp` / `ReplaceApp`: set `BackupURL: input.BackupURL` on the constructed `data.Item`.
- `PatchApp`: `if patch.BackupURL != nil { it.BackupURL = *patch.BackupURL }`.

### `internal/mcpserver/types.go`

Add `BackupURL` to the write DTOs with jsonschema descriptions. Create/Replace use a plain `string` (matching `URL`/`Description`); Patch uses `*string` (matching the existing `Title *string` / `URL *string` pointer fields, so absent → not patched, present `""` → cleared):

```go
type CreateAppInput struct {
    // ... existing fields ...
    BackupURL string `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode"`
}
// ReplaceAppInput.BackupURL is the same plain string.

type PatchAppInput struct {
    // ... existing pointer fields ...
    BackupURL *string `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode; empty string clears it"`
}
```

`get_app` returns `AppDetail`, so `backup_url` is exposed automatically once `AppDetail` carries it.

### `internal/mcpserver/convert.go`

Map `BackupURL` in all three converters, mirroring the existing field handling:

- `toPanelCreateInput` / `toPanelReplaceInput`: `BackupURL: in.BackupURL` (plain string).
- `toPanelPatchInput`: `BackupURL: in.BackupURL` (`*string` copied 1:1 — no lift logic, identical to how `Title`/`URL`/`Description` are passed through).

## Frontend Changes

### `web/src/types/panel.ts`

```typescript
export interface ItemInfo extends InfoBase {
    // ... existing fields ...
    backupUrl?: string
}
```

### `web/src/api/adapters.ts`

- `PanelItemWire`: add `backup_url?: string`.
- `toFrontendItem`: `backupUrl: w.backup_url ?? ''`.
- `toBackendItem`: `backup_url: it.backupUrl ?? ''`.

### `web/src/utils/exportFormat.ts`

`cleanItem` builds an explicit `ItemInfo` shape, so it would otherwise drop the field. Add `backupUrl: item.backupUrl` so backup/restore round-trips the value.

### `web/src/components/common/EditItemDialog.tsx`

- `defaultItem`: add `backupUrl: ''`.
- Add an optional **「备用链接」** `TextField` directly below the existing 「链接」 field (not `required`).
- `validateForm`: if `form.backupUrl` is non-empty after trim, run `isValidUrl(normalizeUrl(form.backupUrl))`; return a clear error on failure. Empty is allowed.
- `handleSave`: `backupUrl: form.backupUrl?.trim() ? normalizeUrl(form.backupUrl) : ''`.

### `web/src/pages/home/useHomeActions.ts`

Add and return a handler (reuses existing `openPage` and `notify`):

```ts
function handleOpenBackupUrl(item: ItemInfo) {
    const url = item.backupUrl?.trim()
    if (url) openPage(url)
    else notify.info('此应用无备用链接')
}
```

### `web/src/pages/Home.tsx`

Rework `handleContextMenu` so browse mode triggers the backup link while edit mode is untouched:

```ts
function handleContextMenu(event: React.MouseEvent, item: ItemInfo, sorting?: boolean) {
    if (sorting) return
    if (canManage) {
        event.preventDefault()
        setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, item })
        return
    }
    // browse mode: right-click opens the backup link
    event.preventDefault()
    handleOpenBackupUrl(item)
}
```

`handleOpenBackupUrl` is destructured from `useHomeActions`. `HomeContextMenu` and its test are unchanged.

### `web/src/pages/home/useHomeSearch.ts`

Add `backupUrl` to the client-side filter so the in-page search box matches it (parity with server-side `search_apps`):

```ts
item.backupUrl?.toLowerCase().includes(value)
```

## Data Flow

```
Save (edit mode):
  EditItemDialog「备用链接」→ normalizeUrl → upsertItem → PUT /api/v1/panel
  → itemInput.BackupURL → normalizePanel → data.Item.BackupURL → homelab-panel.json

Open (browse mode):
  right-click card → handleContextMenu (browse branch) → handleOpenBackupUrl
  → item.backupUrl? window.open(url) : notify.info('此应用无备用链接')

Search (server, MCP):
  search_apps(pattern) → matchesApp checks title/description/icon.text/backup_url
  → returns AppSummary[] WITHOUT backup_url

Search (client, Home box):
  useHomeSearch filters loaded ItemInfo by title/url/description/backupUrl

Detail (MCP / REST):
  get_app / GET /api/v1/panel → AppDetail / data.Item carry backup_url

Export/Import:
  buildFrontendBackup → cleanItem preserves backupUrl → JSON
  import → cleanItem → addItems → PUT /api/v1/panel
```

## Edge Cases

| Scenario | Behavior |
|---|---|
| Browse-mode right-click, no backup link | `notify.info('此应用无备用链接')`; no navigation |
| Edit-mode right-click | Opens edit/copy/delete menu (unchanged), regardless of backup link |
| Sorting-mode right-click | No-op (unchanged) |
| Backup link cleared in edit form | Saves `""` → stored empty → browse right-click notifies |
| `patch_app` with `backup_url: ""` | Clears the field (`panel.AppPatch.BackupURL = &""`) |
| `patch_app` without `backup_url` | Field untouched (`nil` patch pointer) |
| Invalid backup link in edit form | Frontend blocks save (`isValidUrl`); backend also enforces ≤ 2048 length |
| Old export file without `backup_url` | Imports as empty — backward compatible |
| Search by backup URL | Matches; result `AppSummary` omits the field, use `get_app` for the value |

## Files Changed

Backend:

| File | Change |
|---|---|
| `internal/data/models.go` | Add `Item.BackupURL` |
| `internal/handlers/panel.go` | Add `itemInput.BackupURL`; map in `normalizePanel` |
| `internal/panel/types.go` | Add `BackupURL` to `AppDetail`, `AppInput`, `AppPatch` |
| `internal/panel/validate.go` | Validate optional backup URL length |
| `internal/panel/service.go` | `matchesApp` matches `backup_url`; map field in `toAppDetail`/`CreateApp`/`ReplaceApp`/`PatchApp` |
| `internal/mcpserver/types.go` | Add `BackupURL` to `CreateAppInput`/`ReplaceAppInput`/`PatchAppInput` |
| `internal/mcpserver/convert.go` | Map `BackupURL` (DTO → panel, incl. patch pointer lift) |

Frontend:

| File | Change |
|---|---|
| `web/src/types/panel.ts` | Add `backupUrl?` to `ItemInfo` |
| `web/src/api/adapters.ts` | `PanelItemWire.backup_url?`; map in both directions |
| `web/src/utils/exportFormat.ts` | `cleanItem` preserves `backupUrl` |
| `web/src/components/common/EditItemDialog.tsx` | Optional「备用链接」field; normalize + validate on save |
| `web/src/pages/home/useHomeActions.ts` | `handleOpenBackupUrl` |
| `web/src/pages/Home.tsx` | `handleContextMenu` browse-mode branch |
| `web/src/pages/home/useHomeSearch.ts` | Match `backupUrl` |

Tests:

| File | Change |
|---|---|
| `internal/data/models_test.go` | JSON round-trip includes `backup_url` |
| `internal/panel/validate_test.go` | Optional backup URL length cases |
| `internal/panel/service_test.go` | create/replace/patch/search carry/match `backup_url` |
| `internal/mcpserver/convert_test.go` | DTO ↔ panel `BackupURL` mapping, patch clear/omit |
| `web/src/api/adapters.test.ts` | `backup_url` ↔ `backupUrl` round-trip |
| `web/src/utils/exportFormat.test.ts` | `cleanItem` preserves `backupUrl` |

## Validation

```bash
make fmt
make check
make test
git diff --check
```

Manual:

- Edit mode: set a backup link on an app, save. Edit-mode right-click still shows the edit/copy/delete menu.
- Browse mode (sign out, or toggle "browse as guest"): left-click opens the primary link; right-click opens the backup link in a new tab.
- Browse mode on an app with no backup link: right-click shows "此应用无备用链接".
- Search (Home box) by a token in the backup link surfaces the app.
- Export then re-import: backup link survives the round-trip.
