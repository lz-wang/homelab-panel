import { useState } from 'react'

import { saveSort } from '@/api/panel/itemIcon'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import type { SortItemRequest } from '@/types/common'
import type { ItemInfo } from '@/types/panel'

import type { DragState, ItemGroup } from './types'
import { reorder } from './utils'

export function useHomeSort({
  canManage,
  isSearchActive,
  items,
  setItems,
}: {
  canManage: boolean
  isSearchActive: boolean
  items: ItemGroup[]
  setItems: React.Dispatch<React.SetStateAction<ItemGroup[]>>
}) {
  const notify = useNotify()
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [sortSnapshots, setSortSnapshots] = useState<Record<number, ItemInfo[]>>({})

  function setGroupSortStatus(groupIndex: number, sortStatus: boolean) {
    if (isSearchActive)
      return

    const group = items[groupIndex]

    if (sortStatus && group?.id) {
      setSortSnapshots(snapshots => ({
        ...snapshots,
        [group.id as number]: [...(group.items ?? [])],
      }))
    }

    setItems(prev => prev.map((group, index) => {
      if (index !== groupIndex)
        return group

      return { ...group, sortStatus }
    }))
  }

  async function handleSaveSort(group: ItemGroup) {
    if (!canManage || !group.id || !group.items)
      return

    const sortItems: SortItemRequest[] = group.items.reduce<SortItemRequest[]>((result, item, index) => {
      if (item.id)
        result.push({ id: item.id, sort: index + 1 })

      return result
    }, [])
    const res = await saveSort({ itemIconGroupId: group.id, sortItems })

    if (res.code === 0) {
      notify.success(t('common.saveSuccess'))
      setItems(prev => prev.map(item => item.id === group.id ? { ...item, sortStatus: false } : item))
      setSortSnapshots((prev) => {
        const next = { ...prev }
        delete next[group.id as number]
        return next
      })
    }
    else {
      notify.error(`${t('common.saveFail')}:${res.msg}`)
    }
  }

  function handleCancelSort(group: ItemGroup) {
    if (!group.id)
      return

    const snapshot = sortSnapshots[group.id]

    setItems(prev => prev.map(item => item.id === group.id
      ? {
          ...item,
          sortStatus: false,
          items: snapshot ?? item.items,
        }
      : item))
    setSortSnapshots((prev) => {
      const next = { ...prev }
      delete next[group.id as number]
      return next
    })
  }

  function handleDrop(groupIndex: number, itemIndex: number) {
    if (isSearchActive || !dragState || dragState.groupIndex !== groupIndex)
      return

    setItems(prev => prev.map((group, index) => {
      if (index !== groupIndex)
        return group

      return {
        ...group,
        items: reorder(group.items ?? [], dragState.itemIndex, itemIndex),
      }
    }))
    setDragState(null)
  }

  return {
    setDragState,
    setGroupSortStatus,
    handleSaveSort,
    handleCancelSort,
    handleDrop,
  }
}
