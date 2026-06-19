import { del, post, put } from '@/api/request'

export function login(password: string) {
  return post<{ token: string, expires_at?: string }>({ url: '/admin/session', data: { password } })
}

export function logout() {
  return del<void>({ url: '/admin/session' })
}

export function changePassword(oldPassword: string, newPassword: string) {
  return put<{ ok: boolean }>({ url: '/admin/password', data: { old_password: oldPassword, new_password: newPassword } })
}
