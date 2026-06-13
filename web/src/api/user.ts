import { post } from '@/api/request'
import type {
  AuthInfoResponse,
  ReferralCodeResponse,
  UpdatePasswordRequest,
  UpdateUserInfoRequest,
  UserInfo,
} from '@/types/user'

export function getAuthInfo() {
  return post<AuthInfoResponse>({
    url: '/user/getAuthInfo',
  })
}

export function getInfo() {
  return post<UserInfo>({
    url: '/user/getInfo',
  })
}

export function updateInfo(data: UpdateUserInfoRequest) {
  return post<void>({
    url: '/user/updateInfo',
    data,
  })
}

export function updatePassword(data: UpdatePasswordRequest) {
  return post<void>({
    url: '/user/updatePassword',
    data,
  })
}

export function getReferralCode() {
  return post<ReferralCodeResponse>({
    url: '/user/getReferralCode',
  })
}
