import { useState } from 'react'

import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemInfo } from '@/types/panel'

import type { ItemGroup } from './types'

export function useHomeActions({
    canManage,
    items,
    loadList,
}: {
    canManage: boolean
    items: ItemGroup[]
    loadList: () => Promise<void>
}) {
    const notify = useNotify()
    const confirm = useConfirm()
    const [editItemOpen, setEditItemOpen] = useState(false)
    const [editItem, setEditItem] = useState<ItemInfo | null>(null)
    const [addItemIconGroupId, setAddItemIconGroupId] = useState<number | undefined>()
    const [creatingFirstGroup, setCreatingFirstGroup] = useState(false)

    function getItemUrl(item: ItemInfo) {
        return item.url
    }

    function openPage(url: string) {
        window.open(url)
    }

    function handleItemClick(groupIndex: number, item: ItemInfo) {
        const group = items[groupIndex]

        if (group?.sortStatus) return

        openPage(getItemUrl(item))
    }

    function handleOpenBackupUrl(item: ItemInfo) {
        const url = item.backupUrl?.trim()
        if (url) openPage(url)
        else notify.info(t('home.noBackupLink'))
    }

    async function handleDelete(item: ItemInfo) {
        if (!canManage || !item.id) return

        const ok = await confirm({
            title: t('common.delete'),
            content: t('common.deleteConfirmByName', { name: item.title }),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        const res = await usePanelStore.getState().deleteItems([item.id])

        if (res.code === 0) {
            notify.success(t('common.deleteSuccess'))
            await loadList()
        } else {
            notify.error(`${t('common.deleteFail')}:${res.msg}`)
        }
    }

    async function handleCopyItem(item: ItemInfo) {
        if (!canManage || !item.id) return

        const res = await usePanelStore.getState().upsertItem({
            ...item,
            id: undefined,
            title: t('common.copySuffix', {
                name: item.title?.trim() || t('editItem.previewTitleDefault'),
            }),
        })

        if (res.code === 0) {
            notify.success(t('home.copiedApp'))
            await loadList()
        } else {
            notify.error(`${t('common.saveFail')}:${res.msg}`)
        }
    }

    function handleEditItem(item: ItemInfo) {
        if (!canManage) return

        setEditItem({ ...item })
        setAddItemIconGroupId(undefined)
        setEditItemOpen(true)
    }

    function handleAddItem(itemIconGroupId?: number) {
        if (!canManage) return

        setEditItem(null)
        setAddItemIconGroupId(itemIconGroupId)
        setEditItemOpen(true)
    }

    async function handleAddFirstItem() {
        if (!canManage || creatingFirstGroup) return

        const existingGroupId =
            items.find((group) => group.id)?.id ??
            usePanelStore.getState().groups.find((group) => group.id)?.id

        if (existingGroupId) {
            handleAddItem(existingGroupId)
            return
        }

        const existingGroupIds = new Set(
            usePanelStore
                .getState()
                .groups.map((group) => group.id)
                .filter((id): id is number => Boolean(id)),
        )

        setCreatingFirstGroup(true)

        try {
            const res = await usePanelStore.getState().upsertGroup({
                title: t('home.defaultGroup'),
                sort: 1,
            })

            if (res.code !== 0) {
                notify.error(`${t('common.saveFail')}:${res.msg}`)
                return
            }

            const groups = usePanelStore.getState().groups
            const groupId =
                groups.find((group) => group.id && !existingGroupIds.has(group.id))?.id ??
                groups[groups.length - 1]?.id

            if (!groupId) {
                notify.error(t('home.createDefaultGroupFail'))
                return
            }

            await loadList()
            handleAddItem(groupId)
        } finally {
            setCreatingFirstGroup(false)
        }
    }

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
}
