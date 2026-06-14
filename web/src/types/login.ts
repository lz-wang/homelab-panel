import type { UserInfo } from './user'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse extends UserInfo {
  token: string
  expiresAt?: string
}
