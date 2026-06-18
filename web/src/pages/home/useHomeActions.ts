import { useState } from 'react'

import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { PanelStateNetworkModeEnum } from '@/constants/panel'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemInfo } from '@/types/panel'

import type { ItemGroup } from './types'

export function useHomeActions({
  canManage,
  items,
  loadList,
  networkMode,
  setNetworkMode,
}: {
  canManage: boolean
  items: ItemGroup[]
  loadList: () => Promise<void>
  networkMode: PanelStateNetworkModeEnum | null
  setNetworkMode: (mode: PanelStateNetworkModeEnum) => void
}) {
  const notify = useNotify()
  const confirm = useConfirm()
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editItem, setEditItem] = useState<ItemInfo | null>(null)
  const [addItemIconGroupId, setAddItemIconGroupId] = useState<number | undefined>()
  const [creatingFirstGroup, setCreatingFirstGroup] = useState(false)
  const [iframe, setIframe] = useState({
    open: false,
    src: '',
    title: '',
  })

  function getItemUrl(item: ItemInfo) {
    if (networkMode === PanelStateNetworkModeEnum.lan && item.lanUrl)
      return item.lanUrl

    return item.url
  }

  function openPage(openMethod: number, url: string, title?: string) {
    if (openMethod === 1) {
      window.location.href = url
      return
    }

    if (openMethod === 2) {
      window.open(url)
      return
    }

    if (openMethod === 3) {
      setIframe({
        open: true,
        src: url,
        title: title || url,
      })
    }
  }

  function handleItemClick(groupIndex: number, item: ItemInfo) {
    const group = items[groupIndex]

    if (group?.sortStatus)
      return

    openPage(item.openMethod, getItemUrl(item), item.title)
  }

  async function handleDelete(item: ItemInfo) {
    if (!canManage || !item.id)
      return

    const ok = await confirm({
      title: t('common.delete'),
      content: t('common.deleteConfirmByName', { name: item.title }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    const res = await usePanelStore.getState().deleteItems([item.id])

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      await loadList()
    }
    else {
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }
  }

  function handleChangeNetwork(mode: PanelStateNetworkModeEnum) {
    setNetworkMode(mode)
    notify.success(
      mode === PanelStateNetworkModeEnum.lan
        ? t('panelHome.changeToLanModelSuccess')
        : t('panelHome.changeToWanModelSuccess'),
    )
  }

  function handleEditItem(item: ItemInfo) {
    if (!canManage)
      return

    setEditItem({ ...item })
    setAddItemIconGroupId(undefined)
    setEditItemOpen(true)
  }

  function handleAddItem(itemIconGroupId?: number) {
    if (!canManage)
      return

    setEditItem(null)
    setAddItemIconGroupId(itemIconGroupId)
    setEditItemOpen(true)
  }

  async function handleAddFirstItem() {
    if (!canManage || creatingFirstGroup)
      return

    const existingGroupId = items.find(group => group.id)?.id
      ?? usePanelStore.getState().groups.find(group => group.id)?.id

    if (existingGroupId) {
      handleAddItem(existingGroupId)
      return
    }

    const existingGroupIds = new Set(
      usePanelStore.getState().groups
        .map(group => group.id)
        .filter((id): id is number => Boolean(id)),
    )

    setCreatingFirstGroup(true)

    try {
      const res = await usePanelStore.getState().upsertGroup({
        title: '默认分组',
        sort: 1,
      })

      if (res.code !== 0) {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
        return
      }

      const groups = usePanelStore.getState().groups
      const groupId = groups.find(group => group.id && !existingGroupIds.has(group.id))?.id
        ?? groups[groups.length - 1]?.id

      if (!groupId) {
        notify.error('创建默认分组失败')
        return
      }

      await loadList()
      handleAddItem(groupId)
    }
    finally {
      setCreatingFirstGroup(false)
    }
  }

  return {
    iframe,
    setIframe,
    editItemOpen,
    setEditItemOpen,
    editItem,
    addItemIconGroupId,
    creatingFirstGroup,
    getItemUrl,
    openPage,
    handleItemClick,
    handleDelete,
    handleChangeNetwork,
    handleEditItem,
    handleAddItem,
    handleAddFirstItem,
  }
}
