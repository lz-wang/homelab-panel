package panel

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"time"

	"homelab-panel/internal/data"
)

// Service 封装面板分组与应用的读写业务逻辑，是 MCP 工具依赖的唯一业务入口。
type Service struct {
	store *data.Store
}

// NewService 基于已有 data.Store 构造 Service。
func NewService(store *data.Store) *Service {
	return &Service{store: store}
}

// ReplacePanel validates and atomically replaces the complete Web panel payload.
// It keeps stable IDs and creation timestamps for existing records and allocates
// new IDs while holding the store lock.
func (s *Service) ReplacePanel(_ context.Context, replacement data.Panel) (*data.Panel, error) {
	config, err := DecodePanelConfig(replacement.Config)
	if err != nil {
		return nil, err
	}
	replacement.Config, err = EncodePanelConfig(config)
	if err != nil {
		return nil, err
	}
	var result *data.Panel
	err = s.store.Save(func(d *data.StoreData) error {
		now := time.Now()
		oldGroups := make(map[int]data.Group, len(d.Panel.Groups))
		for _, g := range d.Panel.Groups {
			oldGroups[g.ID] = g
		}
		oldItems := make(map[int]data.Item, len(d.Panel.Items))
		for _, item := range d.Panel.Items {
			oldItems[item.ID] = item
		}
		groups := make([]data.Group, 0, len(replacement.Groups))
		groupIDs := make(map[int]bool, len(replacement.Groups))
		for index, input := range replacement.Groups {
			if err := validateGroupInput(GroupInput{Name: input.Name, Icon: input.Icon, Sort: input.Sort}); err != nil {
				return err
			}
			id, created := input.ID, now
			if previous, ok := oldGroups[id]; ok && id != 0 {
				created = previous.CreatedAt
			} else {
				id = d.NextID.Group
				d.NextID.Group++
			}
			sort := input.Sort
			if sort == 0 {
				sort = index + 1
			}
			groupIDs[id] = true
			groups = append(groups, data.Group{ID: id, Name: input.Name, Icon: input.Icon, Sort: sort, CreatedAt: created, UpdatedAt: now})
		}
		items := make([]data.Item, 0, len(replacement.Items))
		for index, input := range replacement.Items {
			if !groupIDs[input.GroupID] {
				return ErrAppGroupDangling
			}
			icon := fromDataIcon(input.Icon)
			if err := validateAppInput(AppInput{GroupID: input.GroupID, Title: input.Title, URL: input.URL, BackupURL: input.BackupURL, Description: input.Description, Icon: icon, Sort: input.Sort}); err != nil {
				return err
			}
			id, created := input.ID, now
			if previous, ok := oldItems[id]; ok && id != 0 {
				created = previous.CreatedAt
			} else {
				id = d.NextID.Item
				d.NextID.Item++
			}
			sort := input.Sort
			if sort == 0 {
				sort = index + 1
			}
			items = append(items, data.Item{ID: id, GroupID: input.GroupID, Title: input.Title, URL: input.URL, BackupURL: input.BackupURL, Description: input.Description, Icon: input.Icon, Sort: sort, CreatedAt: created, UpdatedAt: now})
		}
		replacement.Groups, replacement.Items = groups, items
		d.Panel = replacement
		copy := replacement
		result = &copy
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ListGroups 返回所有分组（不含应用），按 sort、id 升序。
func (s *Service) ListGroups(_ context.Context) ([]GroupSummary, error) {
	snap := s.store.Snapshot()
	groups := make([]GroupSummary, 0, len(snap.Panel.Groups))
	for _, g := range snap.Panel.Groups {
		groups = append(groups, toGroupSummary(g))
	}
	sortGroups(groups)
	return groups, nil
}

// GetPanel 返回完整的面板快照，避免客户端为了解析全部导航而进行多次列表请求。
func (s *Service) GetPanel(_ context.Context) (*PanelSnapshot, error) {
	snap := s.store.Snapshot()
	config, err := DecodePanelConfig(snap.Panel.Config)
	if err != nil {
		return nil, err
	}
	groups := make([]GroupSummary, 0, len(snap.Panel.Groups))
	for _, g := range snap.Panel.Groups {
		groups = append(groups, toGroupSummary(g))
	}
	sortGroups(groups)
	apps := make([]AppDetail, 0, len(snap.Panel.Items))
	for _, it := range snap.Panel.Items {
		apps = append(apps, toAppDetail(it))
	}
	sort.SliceStable(apps, func(i, j int) bool {
		if apps[i].GroupID != apps[j].GroupID {
			return apps[i].GroupID < apps[j].GroupID
		}
		if apps[i].Sort != apps[j].Sort {
			return apps[i].Sort < apps[j].Sort
		}
		return apps[i].ID < apps[j].ID
	})
	return &PanelSnapshot{SiteName: snap.Panel.SiteName, Config: config, Groups: groups, Apps: apps}, nil
}

// ListFiles 返回已上传文件的可引用元数据；文件内容不经 MCP 传输。
func (s *Service) ListFiles(_ context.Context) ([]FileSummary, error) {
	snap := s.store.Snapshot()
	files := make([]FileSummary, 0, len(snap.Files))
	for _, f := range snap.Files {
		files = append(files, FileSummary{ID: f.ID, OriginalName: f.OriginalName, MimeType: f.MimeType, Size: f.Size, URL: f.URL, CreatedAt: f.CreatedAt})
	}
	sort.SliceStable(files, func(i, j int) bool { return files[i].ID < files[j].ID })
	return files, nil
}

// PatchSettings 局部更新已建模的面板设置，持久化格式保持为既有 JSON。
func (s *Service) PatchSettings(_ context.Context, patch PanelSettingsPatch) (*PanelSettings, error) {
	var result *PanelSettings
	err := s.store.Save(func(d *data.StoreData) error {
		config, err := DecodePanelConfig(d.Panel.Config)
		if err != nil {
			return err
		}
		settings, err := ApplyPanelSettingsPatch(PanelSettings{SiteName: d.Panel.SiteName, Config: config}, patch)
		if err != nil {
			return err
		}
		raw, err := EncodePanelConfig(settings.Config)
		if err != nil {
			return err
		}
		d.Panel.SiteName, d.Panel.Config = settings.SiteName, raw
		result = &settings
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ListAppsByGroup 返回指定分组下的应用。分组不存在时返回 ErrGroupNotFound。
func (s *Service) ListAppsByGroup(_ context.Context, groupID int) ([]AppSummary, error) {
	snap := s.store.Snapshot()
	if !groupExists(snap.Panel.Groups, groupID) {
		return nil, ErrGroupNotFound
	}
	items := make([]AppSummary, 0)
	for _, it := range snap.Panel.Items {
		if it.GroupID == groupID {
			items = append(items, toAppSummary(it))
		}
	}
	sortApps(items)
	return items, nil
}

// SearchApps 按正则匹配 title/description/url/backup_url/icon.text，返回精简列表。
// caseSensitive=false 时正则不区分大小写；limit 归一化到 [1,100]，缺省 20。
func (s *Service) SearchApps(_ context.Context, pattern string, caseSensitive bool, limit int) ([]AppSummary, error) {
	if err := validateSearchPattern(pattern); err != nil {
		return nil, err
	}
	if !caseSensitive {
		pattern = "(?i)" + pattern
	}
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}
	limit = normalizeSearchLimit(limit)

	snap := s.store.Snapshot()
	items := make([]AppSummary, 0, limit)
	for _, it := range snap.Panel.Items {
		if matchesApp(re, it) {
			items = append(items, toAppSummary(it))
			if len(items) >= limit {
				break
			}
		}
	}
	sortApps(items)
	return items, nil
}

// GetApp 按 id 返回完整应用详情；不存在时返回 ErrAppNotFound。
func (s *Service) GetApp(_ context.Context, id int) (*AppDetail, error) {
	snap := s.store.Snapshot()
	for _, it := range snap.Panel.Items {
		if it.ID == id {
			d := toAppDetail(it)
			return &d, nil
		}
	}
	return nil, ErrAppNotFound
}

// RenameGroup 重命名分组并返回更新后的精简视图。
func (s *Service) RenameGroup(_ context.Context, groupID int, name string) (*GroupSummary, error) {
	if err := validateGroupName(name); err != nil {
		return nil, err
	}

	var result *GroupSummary
	err := s.store.Save(func(d *data.StoreData) error {
		for i := range d.Panel.Groups {
			if d.Panel.Groups[i].ID == groupID {
				d.Panel.Groups[i].Name = name
				d.Panel.Groups[i].UpdatedAt = time.Now()
				summary := toGroupSummary(d.Panel.Groups[i])
				result = &summary
				return nil
			}
		}
		return ErrGroupNotFound
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// CreateGroup 新建分组，ID 由服务端分配。sort 为 0 时追加到现有分组末尾
// （max sort + 1，无分组时为 1）。返回更新后的精简视图。
func (s *Service) CreateGroup(_ context.Context, input GroupInput) (*GroupSummary, error) {
	if err := validateGroupInput(input); err != nil {
		return nil, err
	}

	var result *GroupSummary
	err := s.store.Save(func(d *data.StoreData) error {
		now := time.Now()
		id := d.NextID.Group
		sort := input.Sort
		if sort == 0 {
			sort = nextGroupSort(d.Panel.Groups)
		}
		g := data.Group{
			ID:        id,
			Name:      input.Name,
			Icon:      input.Icon,
			Sort:      sort,
			CreatedAt: now,
			UpdatedAt: now,
		}
		d.Panel.Groups = append(d.Panel.Groups, g)
		d.NextID.Group = id + 1
		summary := toGroupSummary(g)
		result = &summary
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// PatchGroup 按 id 部分更新分组，仅修改 patch 中非 nil 的字段。
func (s *Service) PatchGroup(_ context.Context, groupID int, patch GroupPatch) (*GroupSummary, error) {
	if err := validateGroupPatch(patch); err != nil {
		return nil, err
	}

	var result *GroupSummary
	err := s.store.Save(func(d *data.StoreData) error {
		for i := range d.Panel.Groups {
			g := &d.Panel.Groups[i]
			if g.ID != groupID {
				continue
			}
			if patch.Name != nil {
				g.Name = *patch.Name
			}
			if patch.Icon != nil {
				g.Icon = *patch.Icon
			}
			if patch.Sort != nil {
				g.Sort = *patch.Sort
			}
			g.UpdatedAt = time.Now()
			summary := toGroupSummary(*g)
			result = &summary
			return nil
		}
		return ErrGroupNotFound
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// DeleteApp 删除单个应用。不存在时返回 ErrAppNotFound。
func (s *Service) DeleteApp(_ context.Context, id int) error {
	return s.store.Save(func(d *data.StoreData) error {
		for i := range d.Panel.Items {
			if d.Panel.Items[i].ID == id {
				d.Panel.Items = append(d.Panel.Items[:i], d.Panel.Items[i+1:]...)
				return nil
			}
		}
		return ErrAppNotFound
	})
}

// DeleteGroup 删除一个空分组。为避免 Agent 意外删除应用，非空分组不会级联删除。
func (s *Service) DeleteGroup(_ context.Context, id int) error {
	return s.store.Save(func(d *data.StoreData) error {
		idx := -1
		for i := range d.Panel.Groups {
			if d.Panel.Groups[i].ID == id {
				idx = i
				break
			}
		}
		if idx < 0 {
			return ErrGroupNotFound
		}
		for _, it := range d.Panel.Items {
			if it.GroupID == id {
				return ErrGroupNotEmpty
			}
		}
		d.Panel.Groups = append(d.Panel.Groups[:idx], d.Panel.Groups[idx+1:]...)
		return nil
	})
}

// ReorderGroups 以集合级原子操作重排全部分组。groupIDs 必须恰好包含每个现有分组一次。
func (s *Service) ReorderGroups(_ context.Context, groupIDs []int) ([]GroupSummary, error) {
	var result []GroupSummary
	err := s.store.Save(func(d *data.StoreData) error {
		if err := validateExactGroupIDs(d.Panel.Groups, groupIDs); err != nil {
			return err
		}
		index := make(map[int]int, len(groupIDs))
		for i, id := range groupIDs {
			index[id] = i + 1
		}
		now := time.Now()
		result = make([]GroupSummary, 0, len(d.Panel.Groups))
		for i := range d.Panel.Groups {
			g := &d.Panel.Groups[i]
			g.Sort = index[g.ID]
			g.UpdatedAt = now
			result = append(result, toGroupSummary(*g))
		}
		sortGroups(result)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ReorderApps 以集合级原子操作重排指定分组内的全部应用。appIDs 必须恰好覆盖该分组的应用。
func (s *Service) ReorderApps(_ context.Context, groupID int, appIDs []int) ([]AppSummary, error) {
	var result []AppSummary
	err := s.store.Save(func(d *data.StoreData) error {
		if !groupExists(d.Panel.Groups, groupID) {
			return ErrGroupNotFound
		}
		apps := make([]data.Item, 0)
		for _, it := range d.Panel.Items {
			if it.GroupID == groupID {
				apps = append(apps, it)
			}
		}
		if err := validateExactAppIDs(apps, appIDs); err != nil {
			return err
		}
		index := make(map[int]int, len(appIDs))
		for i, id := range appIDs {
			index[id] = i + 1
		}
		now := time.Now()
		result = make([]AppSummary, 0, len(appIDs))
		for i := range d.Panel.Items {
			it := &d.Panel.Items[i]
			if it.GroupID != groupID {
				continue
			}
			it.Sort = index[it.ID]
			it.UpdatedAt = now
			result = append(result, toAppSummary(*it))
		}
		sortApps(result)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// CreateApp 在指定分组下新建应用，ID 由服务端分配。
func (s *Service) CreateApp(_ context.Context, input AppInput) (*AppDetail, error) {
	if err := validateAppInput(input); err != nil {
		return nil, err
	}

	var detail *AppDetail
	err := s.store.Save(func(d *data.StoreData) error {
		if !groupExists(d.Panel.Groups, input.GroupID) {
			return ErrGroupNotFound
		}
		now := time.Now()
		id := d.NextID.Item
		it := data.Item{
			ID:          id,
			GroupID:     input.GroupID,
			Title:       input.Title,
			URL:         input.URL,
			BackupURL:   input.BackupURL,
			Description: input.Description,
			Icon:        toDataIconPtr(input.Icon),
			Sort:        input.Sort,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		d.Panel.Items = append(d.Panel.Items, it)
		d.NextID.Item = id + 1
		dd := toAppDetail(it)
		detail = &dd
		return nil
	})
	if err != nil {
		return nil, err
	}
	return detail, nil
}

// ReplaceApp 按 id 完整替换应用配置（保留 id 与 created_at）。
func (s *Service) ReplaceApp(_ context.Context, id int, input AppInput) (*AppDetail, error) {
	if err := validateAppInput(input); err != nil {
		return nil, err
	}

	var detail *AppDetail
	err := s.store.Save(func(d *data.StoreData) error {
		if !groupExists(d.Panel.Groups, input.GroupID) {
			return ErrGroupNotFound
		}
		for i := range d.Panel.Items {
			if d.Panel.Items[i].ID == id {
				created := d.Panel.Items[i].CreatedAt
				d.Panel.Items[i] = data.Item{
					ID:          id,
					GroupID:     input.GroupID,
					Title:       input.Title,
					URL:         input.URL,
					BackupURL:   input.BackupURL,
					Description: input.Description,
					Icon:        toDataIconPtr(input.Icon),
					Sort:        input.Sort,
					CreatedAt:   created,
					UpdatedAt:   time.Now(),
				}
				dd := toAppDetail(d.Panel.Items[i])
				detail = &dd
				return nil
			}
		}
		return ErrAppNotFound
	})
	if err != nil {
		return nil, err
	}
	return detail, nil
}

// PatchApp 按 id 部分更新应用，仅修改 patch 中非 nil 的字段。
func (s *Service) PatchApp(_ context.Context, id int, patch AppPatch) (*AppDetail, error) {
	if err := validateAppPatch(patch); err != nil {
		return nil, err
	}

	var detail *AppDetail
	err := s.store.Save(func(d *data.StoreData) error {
		idx := -1
		for i := range d.Panel.Items {
			if d.Panel.Items[i].ID == id {
				idx = i
				break
			}
		}
		if idx < 0 {
			return ErrAppNotFound
		}
		if patch.GroupID != nil && !groupExists(d.Panel.Groups, *patch.GroupID) {
			return ErrGroupNotFound
		}

		it := &d.Panel.Items[idx]
		if patch.GroupID != nil {
			it.GroupID = *patch.GroupID
		}
		if patch.Title != nil {
			it.Title = *patch.Title
		}
		if patch.URL != nil {
			it.URL = *patch.URL
		}
		if patch.BackupURL != nil {
			it.BackupURL = *patch.BackupURL
		}
		if patch.Description != nil {
			it.Description = *patch.Description
		}
		if patch.Icon != nil {
			it.Icon = toDataIconPtr(*patch.Icon)
		}
		if patch.Sort != nil {
			it.Sort = *patch.Sort
		}
		it.UpdatedAt = time.Now()

		dd := toAppDetail(*it)
		detail = &dd
		return nil
	})
	if err != nil {
		return nil, err
	}
	return detail, nil
}

// ---- 内部辅助 ----

func groupExists(groups []data.Group, id int) bool {
	for _, g := range groups {
		if g.ID == id {
			return true
		}
	}
	return false
}

func validateExactGroupIDs(groups []data.Group, ids []int) error {
	if len(ids) != len(groups) {
		return fmt.Errorf("group IDs must contain every current group exactly once")
	}
	existing := make(map[int]struct{}, len(groups))
	for _, g := range groups {
		existing[g.ID] = struct{}{}
	}
	seen := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		if _, ok := existing[id]; !ok {
			return fmt.Errorf("unknown group ID %d", id)
		}
		if _, ok := seen[id]; ok {
			return fmt.Errorf("duplicate group ID %d", id)
		}
		seen[id] = struct{}{}
	}
	return nil
}

func validateExactAppIDs(apps []data.Item, ids []int) error {
	if len(ids) != len(apps) {
		return fmt.Errorf("app IDs must contain every current app exactly once")
	}
	existing := make(map[int]struct{}, len(apps))
	for _, it := range apps {
		existing[it.ID] = struct{}{}
	}
	seen := make(map[int]struct{}, len(ids))
	for _, id := range ids {
		if _, ok := existing[id]; !ok {
			return fmt.Errorf("unknown app ID %d", id)
		}
		if _, ok := seen[id]; ok {
			return fmt.Errorf("duplicate app ID %d", id)
		}
		seen[id] = struct{}{}
	}
	return nil
}

// nextGroupSort 返回追加到末尾的 sort 值：现有最大 sort + 1，无分组时为 1。
func nextGroupSort(groups []data.Group) int {
	maxSort := 0
	for _, g := range groups {
		if g.Sort > maxSort {
			maxSort = g.Sort
		}
	}
	return maxSort + 1
}

func matchesApp(re *regexp.Regexp, it data.Item) bool {
	if re.MatchString(it.Title) {
		return true
	}
	if it.Description != "" && re.MatchString(it.Description) {
		return true
	}
	if re.MatchString(it.URL) {
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

func sortGroups(groups []GroupSummary) {
	sort.SliceStable(groups, func(i, j int) bool {
		if groups[i].Sort != groups[j].Sort {
			return groups[i].Sort < groups[j].Sort
		}
		return groups[i].ID < groups[j].ID
	})
}

func sortApps(items []AppSummary) {
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Sort != items[j].Sort {
			return items[i].Sort < items[j].Sort
		}
		return items[i].ID < items[j].ID
	})
}

// ---- data <-> panel 转换 ----

func toGroupSummary(g data.Group) GroupSummary {
	return GroupSummary{ID: g.ID, Name: g.Name, Icon: g.Icon, Sort: g.Sort}
}

func toAppSummary(it data.Item) AppSummary {
	return AppSummary{
		ID:          it.ID,
		GroupID:     it.GroupID,
		Title:       it.Title,
		URL:         it.URL,
		Description: it.Description,
		Sort:        it.Sort,
	}
}

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

func fromDataIcon(icon *data.ItemIcon) AppIcon {
	if icon == nil {
		return AppIcon{}
	}
	return AppIcon{
		Text:            icon.Text,
		Color:           icon.Color,
		BackgroundColor: icon.BackgroundColor,
	}
}

// toDataIconPtr 将领域图标转为持久化模型；零值 AppIcon 对应 nil（无图标），
// 而不是落盘成空对象 "icon": {}。
func toDataIconPtr(icon AppIcon) *data.ItemIcon {
	if icon == (AppIcon{}) {
		return nil
	}
	return &data.ItemIcon{
		Text:            icon.Text,
		Color:           icon.Color,
		BackgroundColor: icon.BackgroundColor,
	}
}
