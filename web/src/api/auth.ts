import type { LoginRequest, LoginResponse } from '@/types/login'

import { toAuthUser } from './adapters'
import { post } from './request'

export function login(data: LoginRequest) {
  return post<{ token: string, expiresAt?: string, user: unknown }>({
    url: '/auth/login',
    data,
  }).then(res => ({
    ...res,
    data: res.code === 0
      ? {
          ...toAuthUser(res.data.user ?? {}),
          token: res.data.token,
          expiresAt: res.data.expiresAt,
        } satisfies LoginResponse
      : null as unknown as LoginResponse,
  }))
}

export function logout() {
  return post<void>({
    url: '/auth/logout',
  })
}
