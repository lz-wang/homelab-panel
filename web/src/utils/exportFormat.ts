import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

export interface HomelabPanelExportV1 {
    version: 1
    exportedAt: string
    panel: PanelConfig
    groups: Array<{
        group: ItemIconGroup
        items: ItemInfo[]
    }>
}

export function cleanGroup(group: ItemIconGroup): ItemIconGroup {
    return {
        icon: group.icon,
        title: group.title,
        sort: group.sort,
    }
}

export function cleanItem(item: ItemInfo, itemIconGroupId: number): ItemInfo {
    return {
        icon: item.icon,
        title: item.title,
        url: item.url,
        description: item.description,
        sort: item.sort,
        itemIconGroupId,
    }
}

export function isExportV1(value: unknown): value is HomelabPanelExportV1 {
    if (!value || typeof value !== 'object') return false

    const data = value as Partial<HomelabPanelExportV1>

    return (
        data.version === 1 &&
        Boolean(data.panel) &&
        Array.isArray(data.groups) &&
        data.groups.every((group) => Boolean(group.group) && Array.isArray(group.items))
    )
}
