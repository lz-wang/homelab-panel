package panel

import (
	"context"
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

// SearchApps 按正则匹配 title/description/icon.text，返回精简列表。
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
