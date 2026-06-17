import type { SiteFaviconRequest, SiteFaviconResponse } from '@/types/panel'

export function getSiteFaviconStub(data: SiteFaviconRequest) {
  return Promise.resolve({
    code: -3,
    msg: `后端暂未提供 favicon 获取接口，请手动填写图片 URL：${data.url}`,
    data: {} as SiteFaviconResponse,
  })
}
