import { del, get, post } from '@/api/request'
import type { FileInfo, UploadFilesResponse, UploadImgResponse } from '@/types/panel'

interface BackendFile {
  id?: number
  originalName?: string
  objectKey?: string
  url?: string
  createdAt?: string
}

function toFrontendFile(f: BackendFile): FileInfo {
  return {
    id: f.id ?? 0,
    src: f.url ?? '',
    path: f.url ?? '',
    fileName: f.originalName ?? f.objectKey ?? f.url ?? '',
    createTime: f.createdAt,
    updateTime: f.createdAt,
  }
}

export function uploadImg(file: File) {
  const data = new FormData()
  data.append('imgfile', file)
  data.append('file', file)
  return post<BackendFile[]>({ url: '/files', data }).then((res) => {
    const uploaded = res.code === 0 ? res.data.map(toFrontendFile) : []
    return {
      ...res,
      data: res.code === 0
        ? { imageUrl: uploaded[0]?.src ?? '' }
        : (null as unknown as UploadImgResponse),
    }
  })
}

export function uploadFiles(files: File[]) {
  const data = new FormData()
  files.forEach(file => data.append('files[]', file))
  return post<BackendFile[]>({ url: '/files', data }).then((res) => {
    const uploaded = res.code === 0 ? res.data.map(toFrontendFile) : []
    return {
      ...res,
      data: res.code === 0
        ? {
            succMap: Object.fromEntries(uploaded.map(file => [file.fileName, file.src])),
            errFiles: [],
          }
        : (null as unknown as UploadFilesResponse),
    }
  })
}

export function getList() {
  return get<BackendFile[]>({ url: '/files' }).then(res => ({
    ...res,
    data: res.code === 0 ? { list: res.data.map(toFrontendFile), count: res.data.length } : { list: [], count: 0 },
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
