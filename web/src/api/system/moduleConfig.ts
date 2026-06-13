import { post } from '@/api/request'

export function getByName<T>(name: string) {
  return post<T | null>({
    url: '/system/moduleConfig/getByName',
    data: { name },
  })
}

export function save<T>(name: string, value: T) {
  return post<void>({
    url: '/system/moduleConfig/save',
    data: { name, value },
  })
}
