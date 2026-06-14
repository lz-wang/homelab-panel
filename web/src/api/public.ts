import { toFrontendPublicHome } from '@/api/adapters'
import { get } from '@/api/request'
import type { PublicHomeResponse } from '@/types/panel'

export function getPublicHome() {
  return get<unknown>({ url: '/public/home' }).then(res => ({
    ...res,
    data: res.code === 0 ? toFrontendPublicHome(res.data ?? {}) : null as unknown as PublicHomeResponse,
  }))
}
