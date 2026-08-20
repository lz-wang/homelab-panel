import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    request: vi.fn(),
    interceptorUse: vi.fn(),
}))

vi.mock('axios', () => {
    const instance = {
        get: mocks.get,
        request: mocks.request,
        interceptors: { request: { use: mocks.interceptorUse } },
    }
    return {
        default: {
            create: () => instance,
            isAxiosError: (e: { isAxiosError?: boolean }) => Boolean(e?.isAxiosError),
        },
    }
})

vi.mock('@/store/auth', () => ({
    useAuthStore: {
        getState: () => ({ token: 'tok-abc', status: 'admin', clearToken: vi.fn() }),
    },
}))

import { del, get, http, patch, post, put } from '@/api/request'

describe('request interceptor', () => {
    it('attaches the bearer token from the auth store', () => {
        const fn = mocks.interceptorUse.mock.calls[0]?.[0]
        expect(typeof fn).toBe('function')
        const config: { headers: Record<string, string> } = { headers: {} }
        expect(fn(config)).toBe(config)
        expect(config.headers.Authorization).toBe('Bearer tok-abc')
    })
})

describe('http', () => {
    beforeEach(() => {
        mocks.get.mockReset()
        mocks.request.mockReset()
    })

    it('GET uses request.get with params and normalizes the body', async () => {
        mocks.get.mockResolvedValue({ data: { code: 0, msg: 'ok', data: { a: 1 } } })
        const res = await http<{ a: number }>({ url: '/x', data: { q: 1 } })
        expect(mocks.get).toHaveBeenCalledWith('/x', expect.objectContaining({ params: { q: 1 } }))
        expect(res).toEqual({ code: 0, msg: 'ok', data: { a: 1 } })
    })

    it('non-GET uses request.request with method and data', async () => {
        mocks.request.mockResolvedValue({ data: { code: 0, msg: 'ok', data: null } })
        await http({ url: '/x', method: 'POST', data: { a: 1 } })
        expect(mocks.request).toHaveBeenCalledWith(
            expect.objectContaining({ url: '/x', method: 'POST', data: { a: 1 } }),
        )
    })

    it('normalizes axios errors and still returns a response', async () => {
        mocks.get.mockRejectedValue({
            isAxiosError: true,
            response: { status: 500, data: { message: 'down' } },
        })
        const res = await http({ url: '/x' })
        expect(res.code).toBe(500)
        expect(res.msg).toBe('down')
    })
})

describe('method wrappers', () => {
    beforeEach(() => {
        mocks.get.mockReset()
        mocks.request.mockReset()
        mocks.get.mockResolvedValue({ data: { code: 0, msg: 'ok', data: null } })
        mocks.request.mockResolvedValue({ data: { code: 0, msg: 'ok', data: null } })
    })

    it('get/post/put/patch/del map to the right HTTP methods', async () => {
        await get({ url: '/g' })
        await post({ url: '/p' })
        await put({ url: '/u' })
        await patch({ url: '/pa' })
        await del({ url: '/d' })

        expect(mocks.get).toHaveBeenCalledWith('/g', expect.anything())
        const methods = mocks.request.mock.calls.map((c) => c[0].method)
        expect(methods).toEqual(['POST', 'PUT', 'PATCH', 'DELETE'])
    })
})
