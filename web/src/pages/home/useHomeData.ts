import { useCallback, useState } from 'react'

import { getListByGroupId } from '@/api/panel/itemIcon'
import { getList as getGroupList } from '@/api/panel/itemIconGroup'
import { getPublicHome } from '@/api/public'
import { VisitMode } from '@/constants/auth'
import { useAuthStore } from '@/store/auth'

import type { ItemGroup } from './types'

export function useHomeData() {
  const [items, setItems] = useState<ItemGroup[]>([])

  const loadList = useCallback(async () => {
    const authState = useAuthStore.getState()

    if (!authState.token && authState.visitMode === VisitMode.VISIT_MODE_PUBLIC) {
      const publicRes = await getPublicHome()

      if (publicRes.code !== 0)
        return

      const groups: ItemGroup[] = publicRes.data.groups.map(group => ({
        ...group,
        hoverStatus: false,
        items: publicRes.data.items.filter(item => item.itemIconGroupId === group.id),
      }))

      setItems(groups)
      return
    }

    const groupRes = await getGroupList()

    if (groupRes.code !== 0)
      return

    const groups: ItemGroup[] = groupRes.data.list.map(group => ({
      ...group,
      hoverStatus: false,
      items: [],
    }))

    const withItems = await Promise.all(
      groups.map(async (group) => {
        if (!group.id)
          return group

        const itemRes = await getListByGroupId(group.id)
        return {
          ...group,
          items: itemRes.code === 0 ? itemRes.data.list : [],
        }
      }),
    )

    setItems(withItems)
  }, [])

  return {
    items,
    setItems,
    loadList,
  }
}
