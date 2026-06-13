import { post } from '@/api/request'
import type { SortItemRequest } from '@/types/common'
import type { ItemIconGroup } from '@/types/panel'

export function getList() {
  return post({
    url: '/panel/itemIconGroup/getList',
  })
}

export function edit(data: ItemIconGroup) {
  return post({
    url: '/panel/itemIconGroup/edit',
    data,
  })
}

export function saveSort(sortItems: SortItemRequest[]) {
  return post({
    url: '/panel/itemIconGroup/saveSort',
    data: { sortItems },
  })
}
