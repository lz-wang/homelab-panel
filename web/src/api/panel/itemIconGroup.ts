import { post } from '@/api/request'
import type { ListResponse, SortItemRequest } from '@/types/common'
import type { ItemIconGroup } from '@/types/panel'

export function getList() {
  return post<ListResponse<ItemIconGroup[]>>({
    url: '/panel/itemIconGroup/getList',
  })
}

export function edit(data: ItemIconGroup) {
  return post<ItemIconGroup>({
    url: '/panel/itemIconGroup/edit',
    data,
  })
}

export function saveSort(sortItems: SortItemRequest[]) {
  return post<void>({
    url: '/panel/itemIconGroup/saveSort',
    data: { sortItems },
  })
}

export function deletes(ids: number[]) {
  return post<void>({
    url: '/panel/itemIconGroup/deletes',
    data: { ids },
  })
}
