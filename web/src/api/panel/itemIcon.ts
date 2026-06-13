import { post } from '@/api/request'
import type { SortItemRequest } from '@/types/common'
import type { ItemInfo } from '@/types/panel'

export function getListByGroupId(itemIconGroupId: number | undefined) {
  return post({
    url: '/panel/itemIcon/getListByGroupId',
    data: { itemIconGroupId },
  })
}

export function deletes(ids: number[]) {
  return post({
    url: '/panel/itemIcon/deletes',
    data: { ids },
  })
}

export function saveSort(data: {
  itemIconGroupId: number
  sortItems: SortItemRequest[]
}) {
  return post({
    url: '/panel/itemIcon/saveSort',
    data,
  })
}

export function edit(data: ItemInfo) {
  return post({
    url: '/panel/itemIcon/edit',
    data,
  })
}
