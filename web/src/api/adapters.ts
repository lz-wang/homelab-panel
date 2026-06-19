import type { ItemIcon, ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'
import { keysToCamel, keysToSnake } from '@/utils/case'

export interface PanelWire {
    site_name: string
    config: Record<string, unknown>
    search_engine: Record<string, unknown>
    groups: PanelGroupWire[]
    items: PanelItemWire[]
}

export interface PanelGroupWire {
    id?: number
    name: string
    icon?: string
    sort?: number
}

export interface PanelItemIconWire {
    item_type: number
    src?: string
    text?: string
    color?: string
    background_color?: string
}

export interface PanelItemWire {
    id?: number
    group_id: number
    title: string
    url: string
    description?: string
    icon: PanelItemIconWire | null
    open_method: string
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
        icon: w.icon ? (keysToCamel(w.icon) as ItemIcon) : null,
        title: w.title ?? '',
        url: w.url ?? '',
        description: w.description ?? '',
        openMethod: toFrontendOpenMethod(w.open_method),
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
        description: it.description ?? '',
        icon: it.icon ? (keysToSnake(it.icon) as PanelItemIconWire) : null,
        open_method: toBackendOpenMethod(it.openMethod),
        sort: it.sort,
    }
}

export function toFrontendOpenMethod(value?: string): number {
    if (value === 'current') return 1
    if (value === 'iframe') return 3
    return 2
}

export function toBackendOpenMethod(value?: number): string {
    if (value === 1) return 'current'
    if (value === 3) return 'iframe'
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
        siteName: w.site_name ?? '',
        config: keysToCamel(w.config ?? {}) as PanelConfig,
        searchEngine: keysToCamel(w.search_engine ?? {}),
        groups: (w.groups ?? []).map(toFrontendGroup),
        items: (w.items ?? []).map(toFrontendItem),
    }
}

export function toBackendPanel(doc: FrontendPanel): PanelWire {
    return {
        site_name: doc.siteName,
        config: keysToSnake(doc.config) as Record<string, unknown>,
        search_engine: keysToSnake(doc.searchEngine ?? {}) as Record<string, unknown>,
        groups: doc.groups.map(toBackendGroup),
        items: doc.items.map(toBackendItem),
    }
}
