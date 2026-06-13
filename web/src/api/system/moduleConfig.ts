import { post } from '@/api/request'
import type { ModuleConfig } from '@/types/panel'

export function getByName(name: string) {
  return post<ModuleConfig>({
    url: '/system/moduleConfig/getByName',
    data: { name },
  })
}

export function save(data: Pick<ModuleConfig, 'name' | 'value'>) {
  return post<void>({
    url: '/system/moduleConfig/save',
    data,
  })
}
