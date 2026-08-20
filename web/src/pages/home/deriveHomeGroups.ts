import type { ItemIconGroup, ItemInfo } from '@/types/panel'

import type { ItemGroup } from './types'

/**
 * 由 store 的分组与应用派生首页展示数据：聚合同分组的应用并附加 UI 状态。
 * 复杂度 O(groups + items)，替代逐分组 filter 的 O(groups × items)。
 */
export function deriveHomeGroups(groups: ItemIconGroup[], items: ItemInfo[]): ItemGroup[] {
    const byGroup = new Map<number, ItemInfo[]>()

    for (const item of items) {
        const groupId = item.itemIconGroupId
        if (!groupId) continue

        const list = byGroup.get(groupId)

        if (list) {
            list.push(item)
        } else {
            byGroup.set(groupId, [item])
        }
    }

    return groups.map((group) => ({
        ...group,
        hoverStatus: false,
        items: group.id ? (byGroup.get(group.id) ?? []) : [],
    }))
}
