import { post } from '@/api/request'
import type { UserConfig } from '@/types/panel'

export function getUserConfig() {
  return post<UserConfig>({
    url: '/panel/userConfig/get',
  })
}

export function setUserConfig(data: UserConfig) {
  return post({
    url: '/panel/userConfig/set',
    data,
  })
}
