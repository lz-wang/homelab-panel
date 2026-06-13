import { post } from '@/api/request'
import type { ListResponse } from '@/types/common'
import type { PublicVisitUserRequest, SaveUserRequest, UserInfo, UserListRequest } from '@/types/user'

export function create(data: SaveUserRequest) {
  return post<{ userId: number }>({
    url: '/panel/users/create',
    data,
  })
}

export function update(data: SaveUserRequest) {
  return post<UserInfo>({
    url: '/panel/users/update',
    data,
  })
}

export function getList(data: UserListRequest) {
  return post<ListResponse<UserInfo[]>>({
    url: '/panel/users/getList',
    data,
  })
}

export function deletes(userIds: number[]) {
  return post<void>({
    url: '/panel/users/deletes',
    data: { userIds },
  })
}

export function getPublicVisitUser() {
  return post<UserInfo>({
    url: '/panel/users/getPublicVisitUser',
  })
}

export function setPublicVisitUser(data: PublicVisitUserRequest) {
  return post<void>({
    url: '/panel/users/setPublicVisitUser',
    data,
  })
}
