import type { ListResponse } from '@/types/common'
import type {
  FileInfo,
  ItemIcon,
  ItemIconGroup,
  ItemInfo,
  PanelConfig,
  PublicHomeResponse,
  UserConfig,
} from '@/types/panel'
import type { AppSetting, SaveUserRequest, UserInfo } from '@/types/user'

interface BackendBase {
  id?: number
  createdAt?: string
  updatedAt?: string
}

interface BackendGroup extends BackendBase {
  userId?: number
  name?: string
  icon?: string
  sort?: number
}

interface BackendItem extends BackendBase {
  userId?: number
  groupId?: number
  name?: string
  url?: string
  lanUrl?: string
  description?: string
  icon?: string
  openMethod?: string
  sort?: number
}

interface BackendUser extends BackendBase {
  username?: string
  name?: string
  email?: string
  role?: 'admin' | 'user' | string
  status?: 'active' | 'disabled' | string
}

interface BackendConfig extends BackendBase {
  userId?: number
  panel?: string | PanelConfig
  searchEngine?: string | unknown
}

interface BackendSetting extends BackendBase {
  siteName?: string
  publicEnabled?: boolean
  publicUserId?: number
}

interface BackendFile extends BackendBase {
  originalName?: string
  objectKey?: string
  mimeType?: string
  size?: number
  url?: string
}

interface BackendPublicHome {
  setting?: BackendSetting
  config?: BackendConfig
  groups?: BackendGroup[]
  items?: BackendItem[]
}

export function listResponse<T>(list: T[]): ListResponse<T[]> {
  return {
    list,
    count: list.length,
  }
}

export function toFrontendGroup(value: unknown): ItemIconGroup {
  const group = (value ?? {}) as BackendGroup

  return {
    id: group.id,
    createTime: group.createdAt,
    updateTime: group.updatedAt,
    icon: group.icon,
    title: group.name ?? '',
    sort: group.sort,
  }
}

export function toBackendGroup(group: ItemIconGroup) {
  return {
    name: group.title ?? '',
    icon: group.icon ?? '',
    sort: group.sort,
  }
}

export function toFrontendItem(value: unknown): ItemInfo {
  const item = (value ?? {}) as BackendItem

  return {
    id: item.id,
    createTime: item.createdAt,
    updateTime: item.updatedAt,
    icon: parseIcon(item.icon),
    title: item.name ?? '',
    url: item.url ?? '',
    lanUrl: item.lanUrl ?? '',
    description: item.description ?? '',
    openMethod: toFrontendOpenMethod(item.openMethod),
    sort: item.sort,
    itemIconGroupId: item.groupId,
  }
}

export function toBackendItem(item: ItemInfo) {
  return {
    groupId: item.itemIconGroupId,
    name: item.title,
    url: item.url,
    lanUrl: item.lanUrl ?? '',
    description: item.description ?? '',
    icon: JSON.stringify(item.icon ?? null),
    openMethod: toBackendOpenMethod(item.openMethod),
    sort: item.sort,
  }
}

export function toFrontendUser(value: unknown): UserInfo {
  const user = (value ?? {}) as BackendUser

  return {
    id: user.id,
    userId: user.id,
    createTime: user.createdAt,
    updateTime: user.updatedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    username: user.username,
    name: user.name,
    email: user.email,
    mail: user.email,
    role: user.role === 'admin' ? 1 : 2,
    status: user.status === 'disabled' ? 'disabled' : 'active',
    isAdmin: user.role === 'admin' ? 1 : 0,
  }
}

export function toAuthUser(value: unknown): UserInfo {
  const user = (value ?? {}) as BackendUser

  return {
    ...toFrontendUser(value),
    role: user.role === 'admin' ? 'admin' : 'user',
  }
}

export function toBackendUser(user: SaveUserRequest) {
  return {
    username: user.username,
    password: user.password || undefined,
    name: user.name,
    email: user.email ?? user.mail ?? '',
    role: user.role === 1 ? 'admin' : 'user',
    status: user.status === 'disabled' ? 'disabled' : 'active',
  }
}

export function toFrontendConfig(value: unknown): UserConfig {
  const config = (value ?? {}) as BackendConfig

  return {
    panel: parseJSON<PanelConfig>(config?.panel, {} as PanelConfig),
    searchEngine: parseJSON(config?.searchEngine, {}),
  }
}

export function toBackendConfig(config: UserConfig) {
  return {
    panel: config.panel ?? {},
    searchEngine: config.searchEngine ?? {},
  }
}

export function toFrontendSetting(value: unknown): AppSetting {
  const setting = (value ?? {}) as BackendSetting

  return {
    id: setting?.id,
    siteName: setting?.siteName ?? 'Homelab Panel',
    publicEnabled: Boolean(setting?.publicEnabled),
    publicUserId: setting?.publicUserId ?? 1,
  }
}

export function toBackendSetting(setting: AppSetting) {
  return {
    siteName: setting.siteName || 'Homelab Panel',
    publicEnabled: setting.publicEnabled,
    publicUserId: setting.publicUserId || 1,
  }
}

export function toFrontendFile(value: unknown): FileInfo {
  const file = (value ?? {}) as BackendFile

  return {
    id: file.id ?? 0,
    src: file.url ?? '',
    path: file.url ?? '',
    fileName: file.originalName ?? file.objectKey ?? file.url ?? '',
    createTime: file.createdAt,
    updateTime: file.updatedAt,
  }
}

export function toFrontendPublicHome(value: unknown): PublicHomeResponse {
  const home = (value ?? {}) as BackendPublicHome

  return {
    setting: toFrontendSetting(home.setting),
    config: toFrontendConfig(home.config),
    groups: (home.groups ?? []).map(toFrontendGroup),
    items: (home.items ?? []).map(toFrontendItem),
  }
}

export function toFrontendOpenMethod(value?: string) {
  if (value === 'current')
    return 1
  if (value === 'iframe')
    return 3
  return 2
}

export function toBackendOpenMethod(value?: number) {
  if (value === 1)
    return 'current'
  if (value === 3)
    return 'iframe'
  return 'new_tab'
}

function parseIcon(value: string | undefined): ItemIcon | null {
  if (!value)
    return null
  return parseJSON<ItemIcon | null>(value, null)
}

function parseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string')
    return (value ?? fallback) as T

  try {
    return JSON.parse(value) as T
  }
  catch {
    return fallback
  }
}
