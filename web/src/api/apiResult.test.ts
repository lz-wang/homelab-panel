import { describe, expect, it } from 'vitest'

import {
    API_NETWORK_ERROR_CODE,
    API_SUCCESS_CODE,
    handleLoginExpiration,
    isApiResponse,
    normalizeApiError,
    normalizeApiResponse,
} from '@/api/apiResult'
import { useAuthStore } from '@/store/auth'

describe('isApiResponse', () => {
    it('accepts a valid response shape', () => {
        expect(isApiResponse({ code: 0, msg: 'ok', data: null })).toBe(true)
        expect(isApiResponse({ code: 5, msg: 'x', data: { a: 1 } })).toBe(true)
    })

    it('rejects non-objects and malformed shapes', () => {
        expect(isApiResponse(null)).toBe(false)
        expect(isApiResponse('x')).toBe(false)
        expect(isApiResponse({ code: '0', msg: 'ok', data: null })).toBe(false)
        expect(isApiResponse({ code: 0, msg: 1, data: null })).toBe(false)
        expect(isApiResponse({ code: 0, msg: 'ok' })).toBe(false)
    })
})

describe('normalizeApiResponse', () => {
    it('returns an ApiResponse unchanged', () => {
        const r = { code: 5, msg: 'x', data: { a: 1 } }
        expect(normalizeApiResponse(r)).toBe(r)
    })

    it('wraps a raw value into a success response', () => {
        expect(normalizeApiResponse({ a: 1 })).toEqual({
            code: API_SUCCESS_CODE,
            msg: 'OK',
            data: { a: 1 },
        })
        expect(normalizeApiResponse(null)).toEqual({
            code: API_SUCCESS_CODE,
            msg: 'OK',
            data: null,
        })
    })
})

describe('normalizeApiError', () => {
    it('turns a non-axios error into a network-error response', () => {
        const r = normalizeApiError(new Error('boom'))
        expect(r.code).toBe(API_NETWORK_ERROR_CODE)
        expect(r.msg).toBe('请求失败')
        expect(r.data).toBeNull()
    })

    it('returns the body when the axios response is an ApiResponse', () => {
        const r = normalizeApiError({
            isAxiosError: true,
            response: { status: 400, data: { code: 400, msg: 'bad', data: null } },
        })
        expect(r).toEqual({ code: 400, msg: 'bad', data: null })
    })

    it('uses status + extracted message for a non-API response body', () => {
        const r = normalizeApiError({
            isAxiosError: true,
            response: { status: 500, data: { message: 'server down' } },
        })
        expect(r.code).toBe(500)
        expect(r.msg).toBe('server down')
    })

    it('falls back to a generic server-error message when body has none', () => {
        const r = normalizeApiError({ isAxiosError: true, response: { status: 502, data: 'oops' } })
        expect(r.code).toBe(502)
        expect(r.msg).toBe('服务器错误(502)')
    })

    it('maps ECONNABORTED to a timeout message', () => {
        expect(normalizeApiError({ isAxiosError: true, code: 'ECONNABORTED' }).msg).toBe('请求超时')
    })

    it('maps ERR_CANCELED to a cancelled message', () => {
        expect(normalizeApiError({ isAxiosError: true, code: 'ERR_CANCELED' }).msg).toBe(
            '请求已取消',
        )
    })

    it('maps a response-less axios error to a generic network message', () => {
        expect(normalizeApiError({ isAxiosError: true }).msg).toBe('请检查网络或者服务器错误')
    })
})

describe('handleLoginExpiration', () => {
    it('认证失效时清空登录状态', () => {
        useAuthStore.setState({ token: 'expired-token', status: 'admin' })
        window.location.hash = '#/'

        handleLoginExpiration({ code: 401, msg: 'unauthorized', data: null })

        expect(useAuthStore.getState().token).toBeNull()
        expect(useAuthStore.getState().status).toBe('guest')
        expect(window.location.hash).toBe('#/login')
    })
})
