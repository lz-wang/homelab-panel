import { toBackendConfig, toFrontendConfig } from '@/api/adapters'
import { get, put } from '@/api/request'
import type { UserConfig } from '@/types/panel'

export function getUserConfig() {
  return get<unknown>({ url: '/me/config' }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendConfig(res.data ?? undefined) : null as unknown as UserConfig,
  }))
}

export function setUserConfig(data: UserConfig) {
  return put<unknown>({ url: '/me/config', data: toBackendConfig(data) }).then(res => ({
    ...res,
    data: undefined,
  }))
}
