import { t } from '@/locales'
import type { SiteFaviconRequest, SiteFaviconResponse } from '@/types/panel'

export function getSiteFaviconStub(data: SiteFaviconRequest) {
    return Promise.resolve({
        code: -3,
        msg: t('errors.faviconStub', { url: data.url }),
        data: {} as SiteFaviconResponse,
    })
}
