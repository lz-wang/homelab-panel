# App Backup Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional per-app `backup_url` that opens in a new tab when an app card is right-clicked in browse mode (primary link still opens on left-click); thread the field through the data store, REST API, MCP tools, and the edit form; include it in search matching.

**Architecture:** One optional `string` field traverses every layer bottom-up — `data.Item` → `panel.{AppDetail,AppInput,AppPatch}` (+ validation + service mapping) → MCP DTOs + convert → REST `itemInput`/`normalizePanel` → frontend `ItemInfo` + wire adapters + export format + edit form + right-click handler + search filter. Browse-mode right-click is wired in `Home.handleContextMenu` (edit mode is untouched). Search matches `backup_url` server-side (`matchesApp`) and client-side (`useHomeSearch`), but `AppSummary` does **not** carry the field.

**Tech Stack:** Go (gin) backend; React + MUI + Zustand + Vite + Vitest frontend; MCP via `internal/mcpserver`.

**Commit policy:** Per project `CLAUDE.md`/`AGENTS.md`, do **not** commit/stage/push unless the user explicitly asks. The "Commit" steps below are checkpoints — run the verification, then leave the change in the working tree unless told otherwise.

**Conventions reminder:**
- Go files use **tab** indentation (`gofmt -w` enforces it).
- Frontend TS/TSX uses **4-space** indentation.
- Run the whole-project gate (`make fmt && make check && make test && git diff --check`) after every code change — required even for single-layer edits.

---

## File Structure

| File | Responsibility | Status |
|---|---|---|
| `internal/data/models.go` | Add `Item.BackupURL` JSON field | Modify |
| `internal/data/models_test.go` | snake_case JSON round-trip includes `backup_url` | Modify |
| `internal/panel/types.go` | Add `BackupURL` to `AppDetail`/`AppInput`/`AppPatch` | Modify |
| `internal/panel/validate.go` | Validate optional backup URL length (≤ 2048) | Modify |
| `internal/panel/validate_test.go` | Validation cases for backup URL | Modify |
| `internal/panel/service.go` | Map field in `toAppDetail`/`CreateApp`/`ReplaceApp`/`PatchApp`; match in `matchesApp` | Modify |
| `internal/panel/service_test.go` | create/replace/patch/get/search cover backup URL | Modify |
| `internal/mcpserver/types.go` | Add `BackupURL` to create/replace/patch DTOs | Modify |
| `internal/mcpserver/convert.go` | Map `BackupURL` in all three converters | Modify |
| `internal/mcpserver/convert_test.go` | DTO ↔ panel mapping covers backup URL | Modify |
| `internal/handlers/panel.go` | Add `itemInput.BackupURL`; map in `normalizePanel` | Modify |
| `web/src/types/panel.ts` | Add `backupUrl?: string` to `ItemInfo` | Modify |
| `web/src/api/adapters.ts` | `PanelItemWire.backup_url`; bidirectional mapping | Modify |
| `web/src/api/adapters.test.ts` | `backup_url` ↔ `backupUrl` round-trip | Modify |
| `web/src/utils/exportFormat.ts` | `cleanItem` preserves `backupUrl` | Modify |
| `web/src/utils/exportFormat.test.ts` | `cleanItem` keeps `backupUrl` | Modify |
| `web/src/components/common/EditItemDialog.tsx` | Optional 「备用链接」 field + normalize/validate on save | Modify |
| `web/src/pages/home/useHomeActions.ts` | `handleOpenBackupUrl` (open or notify) | Modify |
| `web/src/pages/Home.tsx` | `handleContextMenu` browse-mode branch | Modify |
| `web/src/pages/home/useHomeSearch.ts` | Match `backupUrl` in client-side filter | Modify |

**Verified manually (DOM/gesture, not unit-tested):** the edit-form field, browse-mode right-click → open/notify. The pure logic (validation, service mapping, MCP convert, wire adapters, export clean, search match) IS unit-tested.

---

## Task 1: Backend data model — `Item.BackupURL` (TDD)

**Files:**
- Modify: `internal/data/models.go` (the `Item` struct, ~line 65)
- Test: `internal/data/models_test.go`

- [ ] **Step 1: Write the failing test**

In `internal/data/models_test.go`, the seeded `Item` (around line 26) currently is:

```go
				{
					ID: 1, GroupID: 1, Title: "i", URL: "https://a",
					Icon:      &ItemIcon{ItemType: 1, BackgroundColor: "#fff"},
					CreatedAt: now, UpdatedAt: now,
				},
```

Add a `BackupURL` value:

```go
				{
					ID: 1, GroupID: 1, Title: "i", URL: "https://a", BackupURL: "https://b",
					Icon:      &ItemIcon{ItemType: 1, BackgroundColor: "#fff"},
					CreatedAt: now, UpdatedAt: now,
				},
```

Then in the snake_case "present" list (around line 47) add `\"backup_url\"`, and in the camelCase "absent" list (around line 57) add `\"backupUrl\"`:

```go
	for _, k := range []string{
		`"next_id"`, `"created_at"`, `"updated_at"`, `"password_hash"`,
		`"site_name"`, `"search_engine"`, `"group_id"`, `"backup_url"`,
		`"item_type"`, `"background_color"`,
		`"original_name"`, `"object_key"`, `"mime_type"`,
	} {
```

```go
	for _, k := range []string{
		`"nextId"`, `"createdAt"`, `"updatedAt"`, `"passwordHash"`,
		`"siteName"`, `"searchEngine"`, `"groupId"`, `"backupUrl"`,
		`"itemType"`, `"backgroundColor"`,
		`"originalName"`, `"objectKey"`, `"mimeType"`,
	} {
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/data/ -run TestStoreDataUsesSnakeCaseJSONKeys -v`
Expected: FAIL — `"backup_url"` not found in JSON (struct has no field yet, so the value isn't serialized).

- [ ] **Step 3: Add the field to `Item`**

In `internal/data/models.go`, the `Item` struct is:

```go
type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
```

Insert `BackupURL` directly after `URL`:

```go
type Item struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	BackupURL   string    `json:"backup_url,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        *ItemIcon `json:"icon"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
```

(`gofmt -w` will realign columns — do not hand-align.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/data/ -v`
Expected: PASS.

- [ ] **Step 5: Commit (checkpoint)**

```bash
git add internal/data/models.go internal/data/models_test.go
git commit -m "feat(data): Item 新增 backup_url 字段"
```

---

## Task 2: Backend panel types + validation (TDD)

**Files:**
- Modify: `internal/panel/types.go`
- Modify: `internal/panel/validate.go`
- Test: `internal/panel/validate_test.go`

- [ ] **Step 1: Write the failing tests**

In `internal/panel/validate_test.go`, extend `TestValidateAppInput`. Its `base` is `AppInput{Title: "t", URL: "u", Icon: AppIcon{}}`. Add a positive assertion for an optional backup URL and a new too-long case. Replace the `cases := []struct{...}{...}` block (lines ~17-28) with:

```go
	// 可选 backup_url：空通过，合法值通过。
	if err := validateAppInput(AppInput{Title: "t", URL: "u", BackupURL: "https://b", Icon: AppIcon{}}); err != nil {
		t.Fatalf("optional backup_url should pass: %v", err)
	}

	cases := []struct {
		name    string
		mutate  func(AppInput) AppInput
		wantSub string
	}{
		{"empty title", func(a AppInput) AppInput { a.Title = ""; return a }, "title is required"},
		{"empty url", func(a AppInput) AppInput { a.URL = ""; return a }, "url is required"},
		{"title too long", func(a AppInput) AppInput { a.Title = strings.Repeat("x", maxAppTitle+1); return a }, "title too long"},
		{"url too long", func(a AppInput) AppInput { a.URL = strings.Repeat("x", maxAppURL+1); return a }, "url too long"},
		{"backup_url too long", func(a AppInput) AppInput { a.BackupURL = strings.Repeat("x", maxAppURL+1); return a }, "backup_url too long"},
		{"description too long", func(a AppInput) AppInput { a.Description = strings.Repeat("x", maxDescription+1); return a }, "description too long"},
		{"negative sort", func(a AppInput) AppInput { a.Sort = -1; return a }, "sort must be non-negative"},
	}
```

Then in `TestValidateAppPatch`, append (before the closing `}`) three backup-URL cases:

```go
	// backup_url：缺省不改、空串清空（均合法），超长报错。
	if err := validateAppPatch(AppPatch{BackupURL: strPtr("")}); err != nil {
		t.Fatalf("empty backup_url (clear) should pass: %v", err)
	}
	if err := validateAppPatch(AppPatch{BackupURL: strPtr("https://b")}); err != nil {
		t.Fatalf("valid backup_url should pass: %v", err)
	}
	if err := validateAppPatch(AppPatch{BackupURL: strPtr(strings.Repeat("x", maxAppURL+1))}); err == nil {
		t.Fatal("too-long backup_url should fail")
	}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/panel/ -run TestValidateApp -v`
Expected: FAIL — `AppInput.BackupURL` / `AppPatch.BackupURL` undefined (compile error).

- [ ] **Step 3: Add the fields to the panel types**

In `internal/panel/types.go`:

`AppDetail` — add `BackupURL` after `URL`:

```go
type AppDetail struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Title       string    `json:"title"`
	URL         string    `json:"url"`
	BackupURL   string    `json:"backup_url,omitempty"`
	Description string    `json:"description,omitempty"`
	Icon        AppIcon   `json:"icon"`
	Sort        int       `json:"sort"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
```

`AppInput` — add `BackupURL string` after `URL`:

```go
type AppInput struct {
	GroupID     int
	Title       string
	URL         string
	BackupURL   string
	Description string
	Icon        AppIcon
	Sort        int
}
```

`AppPatch` — add `BackupURL *string` after `URL`:

```go
type AppPatch struct {
	GroupID     *int
	Title       *string
	URL         *string
	BackupURL   *string
	Description *string
	Icon        *AppIcon
	Sort        *int
}
```

- [ ] **Step 4: Add validation**

In `internal/panel/validate.go`, inside `validateAppInput`, after the `URL` length block:

```go
	if in.URL == "" {
		return fmt.Errorf("item url is required")
	}
	if runeLen(in.URL) > maxAppURL {
		return fmt.Errorf("item url too long (max %d characters)", maxAppURL)
	}
	if runeLen(in.BackupURL) > maxAppURL {
		return fmt.Errorf("item backup_url too long (max %d characters)", maxAppURL)
	}
```

Inside `validateAppPatch`, after the `URL` block (`if p.URL != nil { ... }`):

```go
	if p.URL != nil {
		if *p.URL == "" {
			return fmt.Errorf("item url is required")
		}
		if runeLen(*p.URL) > maxAppURL {
			return fmt.Errorf("item url too long (max %d characters)", maxAppURL)
		}
	}
	if p.BackupURL != nil && *p.BackupURL != "" && runeLen(*p.BackupURL) > maxAppURL {
		return fmt.Errorf("item backup_url too long (max %d characters)", maxAppURL)
	}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `go test ./internal/panel/ -run TestValidateApp -v`
Expected: PASS.

- [ ] **Step 6: Commit (checkpoint)**

```bash
git add internal/panel/types.go internal/panel/validate.go internal/panel/validate_test.go
git commit -m "feat(panel): AppDetail/AppInput/AppPatch 增加 backup_url 及校验"
```

---

## Task 3: Backend panel service — mapping + search match (TDD)

**Files:**
- Modify: `internal/panel/service.go`
- Test: `internal/panel/service_test.go`

- [ ] **Step 1: Write the failing tests**

In `internal/panel/service_test.go`, seed `Proxmox` (line 26) with a backup URL so search/get can assert it:

```go
			{ID: 10, GroupID: 1, Title: "Proxmox", URL: "https://pve", BackupURL: "https://pve-mirror", Description: "virtualization", Sort: 1, Icon: &data.ItemIcon{Text: "mdi:server"}, CreatedAt: now, UpdatedAt: now},
```

In `TestSearchApps`, add a backup-URL match assertion (after the "icon text" case, before the "limit" case):

```go
	// 匹配 backup_url。
	items, _ = svc.SearchApps(ctx, "mirror", false, 0)
	if len(items) != 1 || items[0].Title != "Proxmox" {
		t.Fatalf("search backup_url = %v", items)
	}
```

In `TestGetApp`, assert the backup URL is returned:

```go
	if app.Title != "Proxmox" || app.Icon.Text != "mdi:server" {
		t.Errorf("app = %+v", app)
	}
	if app.BackupURL != "https://pve-mirror" {
		t.Errorf("backup_url = %q, want https://pve-mirror", app.BackupURL)
	}
```

In `TestCreateApp`, extend the create call to include a backup URL and assert it:

```go
	created, err := svc.CreateApp(ctx, AppInput{GroupID: 1, Title: "NewApp", URL: "https://new", BackupURL: "https://new-bak"})
	if err != nil {
		t.Fatalf("CreateApp: %v", err)
	}
	if created.ID == 0 {
		t.Error("server must allocate a non-zero id")
	}
	if created.BackupURL != "https://new-bak" {
		t.Errorf("created backup_url = %q, want https://new-bak", created.BackupURL)
	}
	if appTitleByID(store.Snapshot(), created.ID) != "NewApp" {
		t.Error("created app not persisted")
	}
```

In `TestPatchApp`, add a set + clear case (after the existing `patched` assertions, before the "missing app" case):

```go
	// 设置 backup_url。
	bak := "https://bak"
	patched, err = svc.PatchApp(ctx, 10, AppPatch{BackupURL: &bak})
	if err != nil {
		t.Fatalf("PatchApp backup_url: %v", err)
	}
	if patched.BackupURL != "https://bak" {
		t.Errorf("backup_url = %q, want https://bak", patched.BackupURL)
	}

	// 清空 backup_url。
	emptyBak := ""
	patched, err = svc.PatchApp(ctx, 10, AppPatch{BackupURL: &emptyBak})
	if err != nil {
		t.Fatalf("PatchApp clear backup_url: %v", err)
	}
	if patched.BackupURL != "" {
		t.Errorf("backup_url should be cleared: %q", patched.BackupURL)
	}
```

In `TestReplaceApp`, extend the input and assert:

```go
	replaced, err := svc.ReplaceApp(ctx, 10, AppInput{GroupID: 1, Title: "PVE", URL: "https://pve2", BackupURL: "https://pve2-bak"})
	if err != nil {
		t.Fatalf("ReplaceApp: %v", err)
	}
	if replaced.Title != "PVE" || replaced.URL != "https://pve2" {
		t.Errorf("replaced = %+v", replaced)
	}
	if replaced.BackupURL != "https://pve2-bak" {
		t.Errorf("replaced backup_url = %q, want https://pve2-bak", replaced.BackupURL)
	}
	if replaced.Description != "" {
		t.Errorf("description should be cleared after full replace: %q", replaced.Description)
	}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/panel/ -run "TestSearchApps|TestGetApp|TestCreateApp|TestPatchApp|TestReplaceApp" -v`
Expected: FAIL — backup URL not mapped (`app.BackupURL` empty), search by "mirror" returns 0.

- [ ] **Step 3: Map the field in the service**

In `internal/panel/service.go`:

`toAppDetail` — add `BackupURL: it.BackupURL,`:

```go
func toAppDetail(it data.Item) AppDetail {
	return AppDetail{
		ID:          it.ID,
		GroupID:     it.GroupID,
		Title:       it.Title,
		URL:         it.URL,
		BackupURL:   it.BackupURL,
		Description: it.Description,
		Icon:        fromDataIcon(it.Icon),
		Sort:        it.Sort,
		CreatedAt:   it.CreatedAt,
		UpdatedAt:   it.UpdatedAt,
	}
}
```

`CreateApp` — in the `data.Item{...}` literal add `BackupURL: input.BackupURL,` (alongside `URL: input.URL`).

`ReplaceApp` — in its `data.Item{...}` literal add `BackupURL: input.BackupURL,`.

`PatchApp` — after the existing `URL` patch block add:

```go
		if patch.URL != nil {
			it.URL = *patch.URL
		}
		if patch.BackupURL != nil {
			it.BackupURL = *patch.BackupURL
		}
```

`matchesApp` — add a `BackupURL` match (after the `Description` check, before the `Icon` check):

```go
func matchesApp(re *regexp.Regexp, it data.Item) bool {
	if re.MatchString(it.Title) {
		return true
	}
	if it.Description != "" && re.MatchString(it.Description) {
		return true
	}
	if it.BackupURL != "" && re.MatchString(it.BackupURL) {
		return true
	}
	if it.Icon != nil && it.Icon.Text != "" && re.MatchString(it.Icon.Text) {
		return true
	}
	return false
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `go test ./internal/panel/ -v`
Expected: PASS (all panel tests).

- [ ] **Step 5: Commit (checkpoint)**

```bash
git add internal/panel/service.go internal/panel/service_test.go
git commit -m "feat(panel): service 映射 backup_url 并纳入搜索匹配"
```

---

## Task 4: MCP layer — DTOs + convert (TDD)

**Files:**
- Modify: `internal/mcpserver/types.go`
- Modify: `internal/mcpserver/convert.go`
- Test: `internal/mcpserver/convert_test.go`

- [ ] **Step 1: Write the failing tests**

In `internal/mcpserver/convert_test.go`, extend `TestToPanelCreateInput` — add `BackupURL` to both the input and the expected `want`:

```go
func TestToPanelCreateInput(t *testing.T) {
	in := CreateAppInput{
		GroupID:     1,
		Title:       "t",
		URL:         "u",
		BackupURL:   "bu",
		Description: "d",
		Icon:        &AppIcon{ItemType: 3, Text: "mdi:git", Color: "#FFFFFF", BackgroundColor: "#2196F3"},
		Sort:        5,
	}
	got := toPanelCreateInput(in)
	want := panel.AppInput{
		GroupID: 1, Title: "t", URL: "u", BackupURL: "bu",
		Description: "d", Sort: 5,
		Icon: panel.AppIcon{ItemType: 3, Text: "mdi:git", Color: "#FFFFFF", BackgroundColor: "#2196F3"},
	}
	if got != want {
		t.Errorf("toPanelCreateInput = %+v, want %+v", got, want)
	}
}
```

Extend `TestToPanelReplaceInput` to assert backup URL:

```go
func TestToPanelReplaceInput(t *testing.T) {
	got := toPanelReplaceInput(ReplaceAppInput{ID: 7, GroupID: 2, Title: "r", URL: "ru", BackupURL: "rbu", Sort: 9})
	if got.GroupID != 2 || got.Title != "r" || got.URL != "ru" || got.BackupURL != "rbu" || got.Sort != 9 {
		t.Errorf("toPanelReplaceInput fields not mapped: %+v", got)
	}
}
```

Extend the "pointers and icon mapped" subtest of `TestToPanelPatchInput` to cover the backup URL pointer:

```go
	t.Run("pointers and icon mapped", func(t *testing.T) {
		title := "t"
		url := "u"
		bak := "bu"
		sort := 3
		icon := AppIcon{ItemType: 2, Src: "https://x/a.png"}
		got := toPanelPatchInput(PatchAppInput{
			ID: 2, Title: &title, URL: &url, BackupURL: &bak, Sort: &sort, Icon: &icon,
		})
		if got.Title == nil || *got.Title != "t" {
			t.Errorf("title not mapped: %+v", got.Title)
		}
		if got.URL == nil || *got.URL != "u" {
			t.Errorf("url not mapped: %+v", got.URL)
		}
		if got.BackupURL == nil || *got.BackupURL != "bu" {
			t.Errorf("backup_url not mapped: %+v", got.BackupURL)
		}
		if got.Sort == nil || *got.Sort != 3 {
			t.Errorf("sort not mapped: %+v", got.Sort)
		}
		if got.Icon == nil || got.Icon.ItemType != 2 || got.Icon.Src != "https://x/a.png" {
			t.Errorf("icon not mapped: %+v", got.Icon)
		}
	})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/mcpserver/ -run "TestToPanelCreateInput|TestToPanelReplaceInput|TestToPanelPatchInput" -v`
Expected: FAIL — `CreateAppInput.BackupURL` etc. undefined (compile error).

- [ ] **Step 3: Add the DTO fields**

In `internal/mcpserver/types.go`, add `BackupURL` to the three input DTOs (Create/Replace use a plain `string`, Patch uses `*string`, matching the existing pointer fields):

```go
type CreateAppInput struct {
	GroupID     int      `json:"group_id" jsonschema:"target group id"`
	Title       string   `json:"title" jsonschema:"app title"`
	URL         string   `json:"url" jsonschema:"app url"`
	BackupURL   string   `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode"`
	Description string   `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	Sort        int      `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

type ReplaceAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     int      `json:"group_id" jsonschema:"target group id"`
	Title       string   `json:"title" jsonschema:"app title"`
	URL         string   `json:"url" jsonschema:"app url"`
	BackupURL   string   `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode"`
	Description string   `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	Sort        int      `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}

type PatchAppInput struct {
	ID int `json:"id" jsonschema:"target app id"`

	GroupID     *int     `json:"group_id,omitempty" jsonschema:"target group id"`
	Title       *string  `json:"title,omitempty" jsonschema:"app title"`
	URL         *string  `json:"url,omitempty" jsonschema:"app url"`
	BackupURL   *string  `json:"backup_url,omitempty" jsonschema:"optional backup url opened on right-click in browse mode; empty string clears it"`
	Description *string  `json:"description,omitempty" jsonschema:"optional description"`
	Icon        *AppIcon `json:"icon,omitempty" jsonschema:"app icon"`
	Sort        *int     `json:"sort,omitempty" jsonschema:"sort order, non-negative integer"`
}
```

- [ ] **Step 4: Map the field in the converters**

In `internal/mcpserver/convert.go`, add `BackupURL` to all three:

```go
func toPanelCreateInput(in CreateAppInput) panel.AppInput {
	return panel.AppInput{
		GroupID:     in.GroupID,
		Title:       in.Title,
		URL:         in.URL,
		BackupURL:   in.BackupURL,
		Description: in.Description,
		Icon:        iconToPanel(in.Icon),
		Sort:        in.Sort,
	}
}

func toPanelReplaceInput(in ReplaceAppInput) panel.AppInput {
	return panel.AppInput{
		GroupID:     in.GroupID,
		Title:       in.Title,
		URL:         in.URL,
		BackupURL:   in.BackupURL,
		Description: in.Description,
		Icon:        iconToPanel(in.Icon),
		Sort:        in.Sort,
	}
}

func toPanelPatchInput(in PatchAppInput) panel.AppPatch {
	var icon *panel.AppIcon
	if in.Icon != nil {
		ic := iconToPanel(in.Icon)
		icon = &ic
	}
	return panel.AppPatch{
		GroupID:     in.GroupID,
		Title:       in.Title,
		URL:         in.URL,
		BackupURL:   in.BackupURL,
		Description: in.Description,
		Icon:        icon,
		Sort:        in.Sort,
	}
}
```

(The `*string` copies 1:1 — no special lift logic, identical to `Title`/`URL`.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `go test ./internal/mcpserver/ -v`
Expected: PASS.

- [ ] **Step 6: Commit (checkpoint)**

```bash
git add internal/mcpserver/types.go internal/mcpserver/convert.go internal/mcpserver/convert_test.go
git commit -m "feat(mcp): create/replace/patch_app 支持 backup_url 参数"
```

---

## Task 5: REST handler — `itemInput` + `normalizePanel`

**Files:**
- Modify: `internal/handlers/panel.go`

This is a pure pass-through mirroring the existing `Description`/`URL` mapping; the field's JSON serialization is already covered by Task 1's data-layer round-trip and the wire-casing adapters (Task 7). No new handler test — verify with build/vet/existing tests.

- [ ] **Step 1: Add the field to `itemInput`**

In `internal/handlers/panel.go`, the `itemInput` struct (lines ~30-38):

```go
type itemInput struct {
	ID          int            `json:"id"`
	GroupID     int            `json:"group_id"`
	Title       string         `json:"title"`
	URL         string         `json:"url"`
	BackupURL   string         `json:"backup_url"`
	Description string         `json:"description"`
	Icon        *data.ItemIcon `json:"icon"`
	Sort        int            `json:"sort"`
}
```

- [ ] **Step 2: Map it in `normalizePanel`**

In the `data.Item{...}` literal inside `normalizePanel` (around line 166), add `BackupURL: it.BackupURL,`:

```go
			items = append(items, data.Item{
				ID:          id,
				GroupID:     it.GroupID,
				Title:       it.Title,
				URL:         it.URL,
				BackupURL:   it.BackupURL,
				Description: it.Description,
				Icon:        it.Icon,
				Sort:        sort,
				CreatedAt:   created,
				UpdatedAt:   now,
			})
```

- [ ] **Step 3: Verify the backend still builds and passes**

Run: `go vet ./... && go test ./internal/handlers/...`
Expected: PASS (existing handler tests unaffected; `panelView` serializes `data.Item` directly so `backup_url` is returned by `GET /api/v1/panel` automatically).

- [ ] **Step 4: Commit (checkpoint)**

```bash
git add internal/handlers/panel.go
git commit -m "feat(handlers): panel REST 接口读写 backup_url"
```

---

## Task 6: Backend gate

- [ ] **Step 1: Format + vet + test + build**

Run:

```bash
gofmt -w main.go internal
go vet ./...
go test ./...
go mod verify
CGO_ENABLED=0 go build -o /tmp/homelab-panel-test -ldflags "-s -w" .
```

Expected: all PASS, binary builds. If anything fails, fix the cause before continuing — the frontend tasks depend on a green backend.

---

## Task 7: Frontend types + wire adapters (TDD)

**Files:**
- Modify: `web/src/types/panel.ts`
- Modify: `web/src/api/adapters.ts`
- Test: `web/src/api/adapters.test.ts`

- [ ] **Step 1: Write the failing tests**

In `web/src/api/adapters.test.ts`, extend the `toBackendItem` and `toFrontendItem` tests:

```ts
describe('toBackendItem', () => {
    it('maps fields to snake_case', () => {
        const wire = toBackendItem({
            id: 1,
            icon: null,
            title: 't',
            url: 'u',
            backupUrl: 'bu',
            itemIconGroupId: 3,
        })
        expect(wire.group_id).toBe(3)
        expect(wire.backup_url).toBe('bu')
    })
})
```

```ts
describe('toFrontendItem', () => {
    it('reads snake_case item fields', () => {
        const fe = toFrontendItem({
            group_id: 5,
            title: 't',
            url: 'u',
            backup_url: 'bu',
            icon: null,
        })
        expect(fe.itemIconGroupId).toBe(5)
        expect(fe.backupUrl).toBe('bu')
    })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm run test -- adapters`
Expected: FAIL — `backupUrl`/`backup_url` not mapped.

- [ ] **Step 3: Add the type + adapter mappings**

In `web/src/types/panel.ts`, add `backupUrl?` to `ItemInfo`:

```ts
export interface ItemInfo extends InfoBase {
    icon: ItemIcon | null
    title: string
    url: string
    backupUrl?: string
    sort?: number
    description?: string
    itemIconGroupId?: number
}
```

In `web/src/api/adapters.ts`, add `backup_url?` to `PanelItemWire` (after `url`):

```ts
export interface PanelItemWire {
    id?: number
    group_id: number
    title: string
    url: string
    backup_url?: string
    description?: string
    icon: PanelItemIconWire | null
    sort?: number
}
```

Map it both ways:

```ts
export function toFrontendItem(w: PanelItemWire): ItemInfo {
    return {
        id: w.id,
        icon: w.icon ? (keysToCamel(w.icon) as ItemIcon) : null,
        title: w.title ?? '',
        url: w.url ?? '',
        backupUrl: w.backup_url ?? '',
        description: w.description ?? '',
        sort: w.sort,
        itemIconGroupId: w.group_id,
    }
}

export function toBackendItem(it: ItemInfo): PanelItemWire {
    return {
        id: it.id,
        group_id: it.itemIconGroupId ?? 0,
        title: it.title,
        url: it.url,
        backup_url: it.backupUrl ?? '',
        description: it.description ?? '',
        icon: it.icon ? (keysToSnake(it.icon) as PanelItemIconWire) : null,
        sort: it.sort,
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm run test -- adapters`
Expected: PASS.

- [ ] **Step 5: Commit (checkpoint)**

```bash
git add web/src/types/panel.ts web/src/api/adapters.ts web/src/api/adapters.test.ts
git commit -m "feat(web): ItemInfo 与 wire 适配 backup_url"
```

---

## Task 8: Frontend export format (TDD)

**Files:**
- Modify: `web/src/utils/exportFormat.ts`
- Test: `web/src/utils/exportFormat.test.ts`

- [ ] **Step 1: Write the failing test**

In `web/src/utils/exportFormat.test.ts`, extend the `cleanItem` test so the input carries `backupUrl` and the expected output preserves it:

```ts
	it('rewrites item group identity for import', () => {
		expect(
			cleanItem(
				{
					id: 10,
					title: 'NAS',
					url: 'https://nas.local',
					backupUrl: 'https://nas-bak.local',
					description: 'storage',
					sort: 5,
					itemIconGroupId: 1,
					icon: { itemType: 3, text: 'mdi:nas' },
				},
				9,
			),
		).toEqual({
			title: 'NAS',
			url: 'https://nas.local',
			backupUrl: 'https://nas-bak.local',
			description: 'storage',
			sort: 5,
			itemIconGroupId: 9,
			icon: { itemType: 3, text: 'mdi:nas' },
		})
	})
```

(Note: this file uses **tab** indentation — match it.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm run test -- exportFormat`
Expected: FAIL — `cleanItem` drops `backupUrl`.

- [ ] **Step 3: Preserve `backupUrl` in `cleanItem`**

In `web/src/utils/exportFormat.ts`:

```ts
export function cleanItem(item: ItemInfo, itemIconGroupId: number): ItemInfo {
	return {
		icon: item.icon,
		title: item.title,
		url: item.url,
		backupUrl: item.backupUrl,
		description: item.description,
		sort: item.sort,
		itemIconGroupId,
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm run test -- exportFormat`
Expected: PASS.

- [ ] **Step 5: Commit (checkpoint)**

```bash
git add web/src/utils/exportFormat.ts web/src/utils/exportFormat.test.ts
git commit -m "feat(web): 导出/导入保留 backup_url"
```

---

## Task 9: Edit form — optional 「备用链接」 field

**Files:**
- Modify: `web/src/components/common/EditItemDialog.tsx`

No unit test (DOM interaction); verified manually in Task 12. The form's validation/normalize logic mirrors the existing 「链接」 field.

- [ ] **Step 1: Seed `defaultItem` with an empty backup URL**

Around line 59:

```ts
const defaultItem: ItemInfo = {
    icon: defaultIcon,
    title: '',
    url: '',
    backupUrl: '',
    description: '',
}
```

- [ ] **Step 2: Validate the optional backup URL**

In `validateForm` (around line 117), after the primary URL check and before the group check:

```ts
    function validateForm() {
        if (!form.title.trim()) return '标题不能为空'

        const url = normalizeUrl(form.url)
        if (!url) return '链接不能为空'

        if (!isValidUrl(url)) return '链接无效'

        const backupUrl = form.backupUrl?.trim() ? normalizeUrl(form.backupUrl) : ''
        if (backupUrl && !isValidUrl(backupUrl)) return '备用链接无效'

        if (!form.itemIconGroupId) return '必须选择分组'

        if (!form.icon?.text?.trim()) return 'Iconify 图标不能为空'

        return ''
    }
```

- [ ] **Step 3: Normalize on save**

In `handleSave`, add a normalized `backupUrl` to the `upsertItem` payload (alongside the existing normalized `url`):

```ts
            const res = await upsertItem({
                ...form,
                description: form.description?.trim() ?? '',
                icon: {
                    ...defaultIcon,
                    ...form.icon,
                    itemType: 3,
                    src: '',
                    color: form.icon?.color ?? defaultIcon.color,
                    backgroundColor: form.icon?.backgroundColor ?? defaultIcon.backgroundColor,
                },
                url: normalizeUrl(form.url),
                backupUrl: form.backupUrl?.trim() ? normalizeUrl(form.backupUrl) : '',
            })
```

- [ ] **Step 4: Add the 「备用链接」 TextField**

Below the existing 「链接」 `TextField` (around line 465-471), still inside the outer `<Stack spacing={2}>`, add:

```tsx
                        <TextField
                            label="链接"
                            value={form.url}
                            onChange={(event) => setForm({ ...form, url: event.target.value })}
                            fullWidth
                            required
                        />
                        <TextField
                            label="备用链接"
                            placeholder="浏览模式下右键卡片打开此链接（可选）"
                            value={form.backupUrl ?? ''}
                            onChange={(event) =>
                                setForm({ ...form, backupUrl: event.target.value })
                            }
                            fullWidth
                        />
```

- [ ] **Step 5: Lint + type-check**

Run: `cd web && npm run lint:fix && npm run type-check`
Expected: PASS (no errors).

- [ ] **Step 6: Commit (checkpoint)**

```bash
git add web/src/components/common/EditItemDialog.tsx
git commit -m "feat(web): 编辑卡片新增可选备用链接字段"
```

---

## Task 10: Browse-mode right-click → open backup link

**Files:**
- Modify: `web/src/pages/home/useHomeActions.ts`
- Modify: `web/src/pages/Home.tsx`

No unit test (window/gesture); verified manually in Task 12.

- [ ] **Step 1: Add `handleOpenBackupUrl` to `useHomeActions`**

In `web/src/pages/home/useHomeActions.ts`, `notify` and `openPage` are already in scope. Add the handler after `handleItemClick` (around line 41):

```ts
    function handleOpenBackupUrl(item: ItemInfo) {
        const url = item.backupUrl?.trim()
        if (url) openPage(url)
        else notify.info('此应用无备用链接')
    }
```

Add it to the returned object (around line 147):

```ts
    return {
        editItemOpen,
        setEditItemOpen,
        editItem,
        addItemIconGroupId,
        creatingFirstGroup,
        getItemUrl,
        openPage,
        handleItemClick,
        handleOpenBackupUrl,
        handleDelete,
        handleCopyItem,
        handleEditItem,
        handleAddItem,
        handleAddFirstItem,
    }
```

- [ ] **Step 2: Branch on mode in `Home.handleContextMenu`**

In `web/src/pages/Home.tsx`, destructure `handleOpenBackupUrl` from `useHomeActions` (around line 46):

```ts
    const {
        editItemOpen,
        setEditItemOpen,
        editItem,
        addItemIconGroupId,
        creatingFirstGroup,
        handleItemClick,
        handleOpenBackupUrl,
        handleDelete,
        handleCopyItem,
        handleEditItem,
        handleAddItem,
        handleAddFirstItem,
    } = useHomeActions({
        canManage,
        items,
        loadList,
    })
```

Replace `handleContextMenu` (around line 119) so edit mode keeps the menu and browse mode opens the backup link:

```ts
    function handleContextMenu(event: React.MouseEvent, item: ItemInfo, sorting?: boolean) {
        if (sorting) return

        // 编辑模式：右键打开编辑/复制/删除菜单（保持原行为）。
        if (canManage) {
            event.preventDefault()
            setContextMenu({
                mouseX: event.clientX,
                mouseY: event.clientY,
                item,
            })
            return
        }

        // 浏览模式：右键打开备用链接；无则顶部通知。
        event.preventDefault()
        handleOpenBackupUrl(item)
    }
```

- [ ] **Step 3: Lint + type-check**

Run: `cd web && npm run lint:fix && npm run type-check`
Expected: PASS.

- [ ] **Step 4: Commit (checkpoint)**

```bash
git add web/src/pages/home/useHomeActions.ts web/src/pages/Home.tsx
git commit -m "feat(web): 浏览模式右键卡片打开备用链接"
```

---

## Task 11: Client-side search matches backup URL

**Files:**
- Modify: `web/src/pages/home/useHomeSearch.ts`

- [ ] **Step 1: Add `backupUrl` to the filter**

In `web/src/pages/home/useHomeSearch.ts`, extend the `.filter(...)` predicate (around line 16):

```ts
            return items
                .map((group) => ({
                    ...group,
                    items: group.items?.filter(
                        (item) =>
                            item.title.toLowerCase().includes(value) ||
                            item.url.toLowerCase().includes(value) ||
                            item.backupUrl?.toLowerCase().includes(value) ||
                            item.description?.toLowerCase().includes(value),
                    ),
                }))
                .filter((group) => group.items && group.items.length > 0)
```

- [ ] **Step 2: Lint + type-check**

Run: `cd web && npm run lint:fix && npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit (checkpoint)**

```bash
git add web/src/pages/home/useHomeSearch.ts
git commit -m "feat(web): 前端搜索纳入备用链接匹配"
```

---

## Task 12: Whole-project gate + manual verification

- [ ] **Step 1: Whole-project fix/check/test**

Run from the repo root:

```bash
make fmt
make check
make test
git diff --check
```

Expected: all PASS. (`make fmt` runs `gofmt -w` + frontend `lint:fix`; `make check` runs frontend build/type/lint + backend vet; `make test` runs both with coverage.)

- [ ] **Step 2: Manual E2E**

Start the server (`make serve`) and, in the browser:

1. **Edit mode** (signed in as admin): open an app's edit dialog, fill 「备用链接」 with a URL, save. Right-click the same card → the edit/copy/delete menu still appears (unchanged).
2. **Browse mode** (sign out, or toggle "以访客浏览"): left-click the card → primary link opens in a new tab. Right-click the card → the **backup link** opens in a new tab.
3. **No backup link**: in browse mode, right-click a card that has no backup link → a top-centered info notification "此应用无备用链接" appears.
4. **Search**: type a token that appears only in an app's backup link into the Home search box → the app is filtered into view.
5. **Export/import**: export the panel, re-import it → the backup link survives the round-trip.
6. **Invalid backup link**: in the edit dialog, enter a non-URL string in 「备用链接」 and save → save is blocked with "备用链接无效".

- [ ] **Step 3: Final commit (if the user asks to commit)**

If the user asks to commit everything as one feature:

```bash
git add -A
git commit -m "feat: 应用支持备用链接，浏览模式右键打开"
```

(Otherwise leave the working tree as-is per the commit policy.)

---

## Self-Review Notes

- **Spec coverage:** Every spec section maps to a task — data model (T1), panel types/validate (T2), service mapping + `matchesApp` (T3), MCP DTOs/convert (T4), REST handler (T5), frontend types/adapters (T7), export format (T8), edit form (T9), browse-mode right-click (T10), client search (T11). `AppSummary` is intentionally left without the field (matches spec). Gate + manual E2E (T6, T12).
- **Type consistency:** Field naming is `BackupURL` (Go) / `backup_url` (JSON wire) / `backupUrl` (TS) throughout. `PatchAppInput.BackupURL` is `*string` (matches existing `URL *string`); convert copies it 1:1 (no lift). `handleOpenBackupUrl` name is identical in `useHomeActions` (defined) and `Home.tsx` (consumed).
- **No placeholders:** every code step shows the actual code; every test step shows actual assertions.
