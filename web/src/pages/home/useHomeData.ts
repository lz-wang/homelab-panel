import { useCallback, useState } from 'react'

import { getListByGroupId } from '@/api/panel/itemIcon'
import { getList as getGroupList } from '@/api/panel/itemIconGroup'

import type { ItemGroup } from './types'

export function useHomeData() {
  const [items, setItems] = useState<ItemGroup[]>([])

  const loadList = useCallback(async () => {
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
