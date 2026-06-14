import { listResponse, toBackendGroup, toFrontendGroup } from '@/api/adapters'
import { del, get, patch, post, put } from '@/api/request'
import type { ListResponse, SortItemRequest } from '@/types/common'
import type { ItemIconGroup } from '@/types/panel'

export function getList() {
  return get<unknown[]>({ url: '/groups' }).then(res => ({
    ...res,
    data: res.code === 0 ? listResponse(res.data.map(toFrontendGroup)) : null as unknown as ListResponse<ItemIconGroup[]>,
  }))
}

export function edit(data: ItemIconGroup) {
  const request = data.id
    ? patch<unknown>({ url: `/groups/${data.id}`, data: toBackendGroup(data) })
    : post<unknown>({ url: '/groups', data: toBackendGroup(data) })

  return request.then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendGroup(res.data ?? {}) : null as unknown as ItemIconGroup,
  }))
}

export function saveSort(sortItems: SortItemRequest[]) {
  return put<void>({
    url: '/groups/order',
    data: sortItems,
  })
}

export async function deletes(ids: number[]) {
  for (const id of ids) {
    const res = await del<void>({ url: `/groups/${id}` })
    if (res.code !== 0)
      return res
  }
  return { code: 0, msg: 'OK', data: undefined }
}
