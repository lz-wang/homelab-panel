import type { UserInfo } from './user'

export interface LoginRequest {
  username: string
  password: string
  vcode?: string
}

export interface LoginResponse extends UserInfo {
  token: string
}
