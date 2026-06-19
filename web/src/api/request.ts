import axios, { type AxiosProgressEvent } from 'axios'

import {
    type ApiResponse,
    handleLoginExpiration,
    normalizeApiError,
    normalizeApiResponse,
} from '@/api/apiResult'
import { useAuthStore } from '@/store/auth'

export interface HttpOption {
    url: string
    data?: unknown
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    headers?: Record<string, string>
    onDownloadProgress?: (event: AxiosProgressEvent) => void
    signal?: AbortSignal
}

export const request = axios.create({
    baseURL: '/api/v1',
})

request.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

export async function http<T = unknown>(option: HttpOption): Promise<ApiResponse<T>> {
    const method = option.method ?? 'GET'

    try {
        const response =
            method === 'GET'
                ? await request.get<T>(option.url, {
                      params: option.data,
                      signal: option.signal,
                      onDownloadProgress: option.onDownloadProgress,
                  })
                : await request.request<T>({
                      url: option.url,
                      method,
                      data: option.data,
                      headers: option.headers,
                      signal: option.signal,
                      onDownloadProgress: option.onDownloadProgress,
                  })

        const res = normalizeApiResponse<T>(response.data)

        handleLoginExpiration(res)

        return res
    } catch (error) {
        const res = normalizeApiError<T>(error)

        handleLoginExpiration(res)

        return res
    }
}

export function get<T = unknown>(option: Omit<HttpOption, 'method'>) {
    return http<T>({ ...option, method: 'GET' })
}

export function post<T = unknown>(option: Omit<HttpOption, 'method'>) {
    return http<T>({ ...option, method: 'POST' })
}

export function put<T = unknown>(option: Omit<HttpOption, 'method'>) {
    return http<T>({ ...option, method: 'PUT' })
}

export function patch<T = unknown>(option: Omit<HttpOption, 'method'>) {
    return http<T>({ ...option, method: 'PATCH' })
}

export function del<T = unknown>(option: Omit<HttpOption, 'method'>) {
    return http<T>({ ...option, method: 'DELETE' })
}
