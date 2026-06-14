import { toAuthUser } from '@/api/adapters'
import { getPublicHome } from '@/api/public'
import { get, put } from '@/api/request'
import { VisitMode } from '@/constants/auth'
import type {
  AuthInfoResponse,
  ReferralCodeResponse,
  UpdatePasswordRequest,
  UpdateUserInfoRequest,
  UserInfo,
} from '@/types/user'

export function getAuthInfo() {
  return getPublicHome().then(res => ({
    ...res,
    data: res.code === 0
      ? { user: null, visitMode: VisitMode.VISIT_MODE_PUBLIC }
      : null as unknown as AuthInfoResponse,
  }))
}

export function getInfo() {
  return get<unknown>({
    url: '/auth/me',
  }).then(res => ({
    ...res,
    data: res.code === 0 ? toAuthUser(res.data ?? {}) : null as unknown as UserInfo,
  }))
}

export function updateInfo(data: UpdateUserInfoRequest) {
  return Promise.resolve({
    code: -3,
    msg: '后端暂未提供个人资料更新接口',
    data: data as unknown as void,
  })
}

export function updatePassword(data: UpdatePasswordRequest) {
  return put<void>({
    url: '/auth/password',
    data,
  })
}

export function getReferralCode() {
  return Promise.resolve({
    code: -3,
    msg: '后端暂未提供邀请码接口',
    data: { referralCode: '' } satisfies ReferralCodeResponse,
  })
}
