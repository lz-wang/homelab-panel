import { listResponse, toBackendItem, toFrontendItem } from '@/api/adapters'
import { del, get, patch, post, put } from '@/api/request'
import type { ListResponse, SortItemRequest } from '@/types/common'
import type {
  ItemInfo,
  SiteFaviconRequest,
  SiteFaviconResponse,
} from '@/types/panel'

export function getListByGroupId(itemIconGroupId: number) {
  return get<unknown[]>({ url: '/items', data: { groupId: itemIconGroupId } }).then(res => ({
    ...res,
    data: res.code === 0 ? listResponse(res.data.map(toFrontendItem)) : null as unknown as ListResponse<ItemInfo[]>,
  }))
}

export async function deletes(ids: number[]) {
  for (const id of ids) {
    const res = await del<void>({ url: `/items/${id}` })
    if (res.code !== 0)
      return res
  }
  return { code: 0, msg: 'OK', data: undefined }
}

export function saveSort(data: {
  itemIconGroupId: number
  sortItems: SortItemRequest[]
}) {
  return put<void>({
    url: '/items/order',
    data: data.sortItems,
  })
}

export function edit(data: ItemInfo) {
  const request = data.id
    ? patch<unknown>({ url: `/items/${data.id}`, data: toBackendItem(data) })
    : post<unknown>({ url: '/items', data: toBackendItem(data) })

  return request.then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendItem(res.data ?? {}) : null as unknown as ItemInfo,
  }))
}

export function addMultiple(data: ItemInfo[]) {
  return post<unknown[]>({ url: '/items/batch', data: data.map(toBackendItem) }).then(res => ({
    ...res,
    data: res.code === 0 ? res.data.map(toFrontendItem) : null as unknown as ItemInfo[],
  }))
}

export function getSiteFavicon(data: SiteFaviconRequest) {
  return Promise.resolve({
    code: -3,
    msg: `后端暂未提供 favicon 获取接口，请手动填写图片 URL：${data.url}`,
    data: {} as SiteFaviconResponse,
  })
}
