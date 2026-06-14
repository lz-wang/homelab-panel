export interface UserInfo {
  id?: number
  userId?: number
  name?: string
  createTime?: string
  updateTime?: string
  username?: string
  password?: string
  status?: number
  role?: number
  mail?: string
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
