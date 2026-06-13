import { post } from '@/api/request'
import type { ListResponse, SortItemRequest } from '@/types/common'
import type {
  ItemInfo,
  SiteFaviconRequest,
  SiteFaviconResponse,
} from '@/types/panel'

export function getListByGroupId(itemIconGroupId: number) {
  return post<ListResponse<ItemInfo[]>>({
    url: '/panel/itemIcon/getListByGroupId',
    data: { itemIconGroupId },
  })
}

export function deletes(ids: number[]) {
  return post<void>({
    url: '/panel/itemIcon/deletes',
    data: { ids },
  })
}

export function saveSort(data: {
  itemIconGroupId: number
  sortItems: SortItemRequest[]
}) {
  return post<void>({
    url: '/panel/itemIcon/saveSort',
    data,
  })
}

export function edit(data: ItemInfo) {
  return post<ItemInfo>({
    url: '/panel/itemIcon/edit',
    data,
  })
}

export function addMultiple(data: ItemInfo[]) {
  return post<ItemInfo[]>({
    url: '/panel/itemIcon/addMultiple',
    data,
  })
}

export function getSiteFavicon(data: SiteFaviconRequest) {
  return post<SiteFaviconResponse>({
    url: '/panel/itemIcon/getSiteFavicon',
    data,
  })
}
