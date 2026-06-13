import axios, { type AxiosProgressEvent } from 'axios'

import { useAuthStore } from '@/store/auth'

export interface ApiResponse<T = unknown> {
  data: T
  msg: string
  code: number
}

export interface HttpOption {
  url: string
  data?: unknown
  method?: 'GET' | 'POST'
  headers?: Record<string, string>
  onDownloadProgress?: (event: AxiosProgressEvent) => void
  signal?: AbortSignal
}

export const request = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL,
})

request.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.headers.token = token
  }

  return config
})

export async function http<T = unknown>(option: HttpOption): Promise<ApiResponse<T>> {
  const method = option.method ?? 'GET'
  const response = method === 'GET'
    ? await request.get<ApiResponse<T>>(option.url, {
        params: option.data,
        signal: option.signal,
        onDownloadProgress: option.onDownloadProgress,
      })
    : await request.post<ApiResponse<T>>(option.url, option.data ?? {}, {
        headers: option.headers,
        signal: option.signal,
        onDownloadProgress: option.onDownloadProgress,
      })

  const res = response.data

  if (res.code === 1000 || res.code === 1001) {
    useAuthStore.getState().removeToken()
    window.location.hash = '#/login'
  }

  return res
}

export function get<T = unknown>(option: Omit<HttpOption, 'method'>) {
  return http<T>({ ...option, method: 'GET' })
}

export function post<T = unknown>(option: Omit<HttpOption, 'method'>) {
  return http<T>({ ...option, method: 'POST' })
}
