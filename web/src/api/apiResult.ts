import axios, { type AxiosError } from 'axios'

import { useAuthStore } from '@/store/auth'

export interface ApiResponse<T = unknown> {
  data: T
  msg: string
  code: number
}

export const API_SUCCESS_CODE = 0
export const API_AUTH_EXPIRED_CODES = new Set([1000, 1001])
export const API_NETWORK_ERROR_CODE = -1
export const API_HTTP_ERROR_CODE = -2
export const API_INVALID_RESPONSE_CODE = -3

let loginExpirationHandled = false

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!value || typeof value !== 'object')
    return false

  const candidate = value as Partial<ApiResponse>

  return typeof candidate.code === 'number' && typeof candidate.msg === 'string' && 'data' in candidate
}

export function normalizeApiResponse<T = unknown>(value: unknown): ApiResponse<T> {
  if (isApiResponse(value))
    return value as ApiResponse<T>

  return {
    code: API_INVALID_RESPONSE_CODE,
    msg: '服务器响应格式不正确',
    data: null as T,
  }
}

export function normalizeApiError<T = unknown>(error: unknown): ApiResponse<T> {
  if (!axios.isAxiosError(error)) {
    return {
      code: API_NETWORK_ERROR_CODE,
      msg: '请求失败',
      data: null as T,
    }
  }

  const axiosError = error as AxiosError

  if (axiosError.response) {
    const responseData = normalizeApiResponse<T>(axiosError.response.data)

    if (responseData.code !== API_INVALID_RESPONSE_CODE)
      return responseData

    return {
      code: API_HTTP_ERROR_CODE,
      msg: `服务器错误(${axiosError.response.status})`,
      data: null as T,
    }
  }

  if (axiosError.code === 'ECONNABORTED') {
    return {
      code: API_NETWORK_ERROR_CODE,
      msg: '请求超时',
      data: null as T,
    }
  }

  if (axiosError.code === 'ERR_CANCELED') {
    return {
      code: API_NETWORK_ERROR_CODE,
      msg: '请求已取消',
      data: null as T,
    }
  }

  return {
    code: API_NETWORK_ERROR_CODE,
    msg: '请检查网络或者服务器错误',
    data: null as T,
  }
}

export function handleLoginExpiration(response: ApiResponse) {
  if (!API_AUTH_EXPIRED_CODES.has(response.code) || loginExpirationHandled)
    return

  loginExpirationHandled = true
  useAuthStore.getState().removeToken()

  if (window.location.hash !== '#/login')
    window.location.hash = '#/login'
}
