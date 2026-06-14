import {
  toBackendSetting,
  toBackendUser,
  toFrontendSetting,
  toFrontendUser,
} from '@/api/adapters'
import { del, get, patch, post, put } from '@/api/request'
import type { ListResponse } from '@/types/common'
import type { AppSetting, PublicVisitUserRequest, SaveUserRequest, UserInfo, UserListRequest } from '@/types/user'

export function create(data: SaveUserRequest) {
  return post<unknown>({ url: '/users', data: toBackendUser(data) }).then(res => ({
    ...res,
    data: res.code === 0 ? { userId: toFrontendUser(res.data ?? {}).id ?? 0 } : null as unknown as { userId: number },
  }))
}

export function update(data: SaveUserRequest) {
  return patch<unknown>({ url: `/users/${data.id}`, data: toBackendUser(data) }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendUser(res.data ?? {}) : null as unknown as UserInfo,
  }))
}

export function getList(data: UserListRequest) {
  return get<unknown[]>({ url: '/users' }).then((res) => {
    const keyword = data.keyword?.toLowerCase()
    const users = res.code === 0
      ? res.data.map(toFrontendUser).filter(user => !keyword
        || user.username?.toLowerCase().includes(keyword)
        || user.name?.toLowerCase().includes(keyword))
      : []
    const start = Math.max(0, data.page - 1) * data.limit

    return {
      ...res,
      data: res.code === 0
        ? {
            list: users.slice(start, start + data.limit),
            count: users.length,
          }
        : null as unknown as ListResponse<UserInfo[]>,
    }
  })
}

export async function deletes(userIds: number[]) {
  for (const userId of userIds) {
    const res = await del<void>({ url: `/users/${userId}` })
    if (res.code !== 0)
      return res
  }
  return { code: 0, msg: 'OK', data: undefined }
}

export function getPublicVisitUser() {
  return getSetting().then(async (settingRes) => {
    if (settingRes.code !== 0 || !settingRes.data.publicEnabled)
      return { ...settingRes, data: null as unknown as UserInfo }

    const usersRes = await get<unknown[]>({ url: '/users' })
    const user = usersRes.code === 0
      ? usersRes.data.map(toFrontendUser).find(item => item.id === settingRes.data.publicUserId)
      : null

    return {
      ...usersRes,
      data: user ?? null as unknown as UserInfo,
    }
  })
}

export async function setPublicVisitUser(data: PublicVisitUserRequest) {
  const current = await getSetting()
  if (current.code !== 0)
    return current

  return updateSetting({
    ...current.data,
    publicEnabled: data.userId != null,
    publicUserId: data.userId ?? current.data.publicUserId ?? 1,
  }).then(res => ({
    ...res,
    data: undefined,
  }))
}

export function getSetting() {
  return get<unknown>({ url: '/settings' }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendSetting(res.data ?? undefined) : null as unknown as AppSetting,
  }))
}

export function updateSetting(data: AppSetting) {
  return put<unknown>({ url: '/settings', data: toBackendSetting(data) }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendSetting(res.data ?? undefined) : null as unknown as AppSetting,
  }))
}
