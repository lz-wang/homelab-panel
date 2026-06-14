import { listResponse, toFrontendFile } from '@/api/adapters'
import { del, get, post } from '@/api/request'
import type { ListResponse } from '@/types/common'
import type { FileInfo, UploadFilesResponse, UploadImgResponse } from '@/types/panel'

export function uploadImg(file: File) {
  const data = new FormData()
  data.append('imgfile', file)

  data.append('file', file)

  return post<unknown[]>({ url: '/files', data }).then((res) => {
    const uploaded = res.code === 0 ? res.data.map(toFrontendFile) : []
    return {
      ...res,
      data: res.code === 0
        ? { imageUrl: uploaded[0]?.src ?? '' }
        : null as unknown as UploadImgResponse,
    }
  })
}

export function uploadFiles(files: File[]) {
  const data = new FormData()
  files.forEach(file => data.append('files[]', file))

  return post<unknown[]>({ url: '/files', data }).then((res) => {
    const uploaded = res.code === 0 ? res.data.map(toFrontendFile) : []
    return {
      ...res,
      data: res.code === 0
        ? {
            succMap: Object.fromEntries(uploaded.map(file => [file.fileName, file.src])),
            errFiles: [],
          }
        : null as unknown as UploadFilesResponse,
    }
  })
}

export function getList() {
  return get<unknown[]>({ url: '/files' }).then(res => ({
    ...res,
    data: res.code === 0 ? listResponse(res.data.map(toFrontendFile)) : null as unknown as ListResponse<FileInfo[]>,
  }))
}

export async function deletes(ids: number[]) {
  for (const id of ids) {
    const res = await del<void>({ url: `/files/${id}` })
    if (res.code !== 0)
      return res
  }
  return { code: 0, msg: 'OK', data: undefined }
}
