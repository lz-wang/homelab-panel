import { post } from '@/api/request'
import type { ListResponse } from '@/types/common'
import type { FileInfo, UploadFilesResponse, UploadImgResponse } from '@/types/panel'

export function uploadImg(file: File) {
  const data = new FormData()
  data.append('imgfile', file)

  return post<UploadImgResponse>({
    url: '/file/uploadImg',
    data,
  })
}

export function uploadFiles(files: File[]) {
  const data = new FormData()
  files.forEach(file => data.append('files[]', file))

  return post<UploadFilesResponse>({
    url: '/file/uploadFiles',
    data,
  })
}

export function getList() {
  return post<ListResponse<FileInfo[]>>({
    url: '/file/getList',
  })
}

export function deletes(ids: number[]) {
  return post<void>({
    url: '/file/deletes',
    data: { ids },
  })
}
