import type { LoginRequest, LoginResponse } from '@/types/login'

import { post } from './request'

export function login(data: LoginRequest) {
  return post<LoginResponse>({
    url: '/login',
    data,
  })
}

export function logout() {
  return post({
    url: '/logout',
  })
}
