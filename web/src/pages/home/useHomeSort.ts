import { useMemo, useState } from 'react'

import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemInfo } from '@/types/panel'

import type { DragState, ItemGroup } from './types'
import { reorder } from './utils'

// 排序会话：分组进入排序模式后，本地覆写该分组的应用顺序；保存或取消后移除，
// 展示顺序回到 store 派生的服务器顺序。覆写不改变分组数量与顺序，
// 因此分组索引在 baseGroups 与合并结果之间保持一致。
interface SortSession {
    items: ItemInfo[]
}

export function useHomeSort({
    canManage,
    baseGroups,
}: {
    canManage: boolean
    baseGroups: ItemGroup[]
}) {
    const notify = useNotify()
    const [dragState, setDragState] = useState<DragState | null>(null)
    const [sortSessions, setSortSessions] = useState<Record<number, SortSession>>({})

    const groups = useMemo(
        () =>
            baseGroups.map((group) => {
                const session = group.id ? sortSessions[group.id] : undefined

                return session ? { ...group, sortStatus: true, items: session.items } : group
            }),
        [baseGroups, sortSessions],
    )

    function endSortSession(groupId: number) {
        setSortSessions((prev) => {
            if (!(groupId in prev)) return prev

            const next = { ...prev }
            delete next[groupId]
            return next
        })
    }

    function setGroupSortStatus(groupIndex: number, sortStatus: boolean) {
        const group = baseGroups[groupIndex]
        if (!group?.id) return

        if (sortStatus) {
            const items = group.items ?? []
            setSortSessions((prev) => ({ ...prev, [group.id as number]: { items } }))
        } else {
            endSortSession(group.id)
        }
    }

    async function handleSaveSort(group: ItemGroup) {
        if (!canManage || !group.id || !group.items) return

        const reordered = group.items.map((item, index) => ({ ...item, sort: index + 1 }))
        const others = groups.flatMap((g) =>
            g.id === group.id
                ? []
                : (g.items ?? []).map((it, index) => ({ ...it, sort: index + 1 })),
        )
        const res = await usePanelStore.getState().replaceItems([...others, ...reordered])

        if (res.code === 0) {
            notify.success(t('common.saveSuccess'))
            endSortSession(group.id)
        } else {
            notify.error(`${t('common.saveFail')}:${res.msg}`)
        }
    }

    function handleCancelSort(group: ItemGroup) {
        if (!group.id) return

        // 移除覆写即回到 store 派生顺序（进入排序后没有写入，服务器顺序即进入时顺序）。
        endSortSession(group.id)
    }

    function handleDrop(groupIndex: number, itemIndex: number) {
        if (!dragState || dragState.groupIndex !== groupIndex) return

        const groupId = baseGroups[groupIndex]?.id
        const session = groupId ? sortSessions[groupId] : undefined
        if (!groupId || !session) return

        setSortSessions((prev) => ({
            ...prev,
            [groupId]: { items: reorder(session.items, dragState.itemIndex, itemIndex) },
        }))
        setDragState(null)
    }

    return {
        groups,
        setDragState,
        setGroupSortStatus,
        handleSaveSort,
        handleCancelSort,
        handleDrop,
    }
}
