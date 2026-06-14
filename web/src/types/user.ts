export interface UserInfo {
  id?: number
  userId?: number
  name?: string
  createTime?: string
  updateTime?: string
  createdAt?: string
  updatedAt?: string
  username?: string
  password?: string
  status?: number | 'active' | 'disabled'
  role?: number | 'admin' | 'user'
  mail?: string
  email?: string
  token?: string
  referralCode?: string
  isAdmin?: number
}

export interface AuthInfoResponse {
  user: UserInfo | null
  visitMode: number
}

export interface UpdateUserInfoRequest {
  name: string
}

export interface UpdatePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface ReferralCodeResponse {
  referralCode: string
}

export interface UserListRequest {
  page: number
  limit: number
  keyword?: string
}

export interface SaveUserRequest extends UserInfo {
  username: string
  name: string
  password?: string
  role: number
}

export interface PublicVisitUserRequest {
  userId: number | null
}

export interface AppSetting {
  id?: number
  siteName: string
  publicEnabled: boolean
  publicUserId: number
}
