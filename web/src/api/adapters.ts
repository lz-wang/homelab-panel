import type { ItemIcon, ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

export interface PanelWire {
  siteName: string
  config: PanelConfig
  searchEngine: unknown
  groups: PanelGroupWire[]
  items: PanelItemWire[]
}

export interface PanelGroupWire {
  id?: number
  name: string
  icon?: string
  sort?: number
}

export interface PanelItemWire {
  id?: number
  groupId: number
  title: string
  url: string
  lanUrl?: string
  description?: string
  icon: ItemIcon | null
  openMethod: string
  sort?: number
}

export function toFrontendGroup(w: PanelGroupWire): ItemIconGroup {
  return {
    id: w.id,
    icon: w.icon,
    title: w.name ?? '',
    sort: w.sort,
  }
}

export function toBackendGroup(g: ItemIconGroup): PanelGroupWire {
  return { id: g.id, name: g.title ?? '', icon: g.icon ?? '', sort: g.sort }
}

export function toFrontendItem(w: PanelItemWire): ItemInfo {
  return {
    id: w.id,
    icon: w.icon ?? null,
    title: w.title ?? '',
    url: w.url ?? '',
    lanUrl: w.lanUrl ?? '',
    description: w.description ?? '',
    openMethod: toFrontendOpenMethod(w.openMethod),
    sort: w.sort,
    itemIconGroupId: w.groupId,
  }
}

export function toBackendItem(it: ItemInfo): PanelItemWire {
  return {
    id: it.id,
    groupId: it.itemIconGroupId ?? 0,
    title: it.title,
    url: it.url,
    lanUrl: it.lanUrl ?? '',
    description: it.description ?? '',
    icon: it.icon ?? null,
    openMethod: toBackendOpenMethod(it.openMethod),
    sort: it.sort,
  }
}

export function toFrontendOpenMethod(value?: string): number {
  if (value === 'current')
    return 1
  if (value === 'iframe')
    return 3
  return 2
}

export function toBackendOpenMethod(value?: number): string {
  if (value === 1)
    return 'current'
  if (value === 3)
    return 'iframe'
  return 'new_tab'
}

export interface FrontendPanel {
  siteName: string
  config: PanelConfig
  searchEngine: unknown
  groups: ItemIconGroup[]
  items: ItemInfo[]
}

export function toFrontendPanel(w: PanelWire): FrontendPanel {
  return {
    siteName: w.siteName ?? '',
    config: (w.config ?? {}) as PanelConfig,
    searchEngine: w.searchEngine ?? {},
    groups: (w.groups ?? []).map(toFrontendGroup),
    items: (w.items ?? []).map(toFrontendItem),
  }
}

export function toBackendPanel(doc: FrontendPanel): PanelWire {
  return {
    siteName: doc.siteName,
    config: doc.config,
    searchEngine: doc.searchEngine ?? {},
    groups: doc.groups.map(toBackendGroup),
    items: doc.items.map(toBackendItem),
  }
}
