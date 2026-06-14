import axios, { type AxiosError } from 'axios'

import { useAuthStore } from '@/store/auth'

export interface ApiResponse<T = unknown> {
  data: T
  msg: string
  code: number
}

export const API_SUCCESS_CODE = 0
export const API_AUTH_EXPIRED_CODES = new Set([401, 403, 1000, 1001])
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
    code: API_SUCCESS_CODE,
    msg: 'OK',
    data: value as T,
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
    const data = axiosError.response.data
    const status = axiosError.response.status

    if (isApiResponse(data))
      return data as ApiResponse<T>

    return {
      code: status || API_HTTP_ERROR_CODE,
      msg: errorMessage(data) ?? `服务器错误(${status})`,
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

function errorMessage(value: unknown) {
  if (!value || typeof value !== 'object')
    return null

  const candidate = value as { error?: unknown, msg?: unknown, message?: unknown }
  if (typeof candidate.error === 'string')
    return candidate.error
  if (typeof candidate.msg === 'string')
    return candidate.msg
  if (typeof candidate.message === 'string')
    return candidate.message

  return null
}
