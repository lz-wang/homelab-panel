import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validateSession } from '@/api/session'

function mockFetch(response: { ok: boolean; status: number; json: unknown }) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: response.ok,
            status: response.status,
            json: async () => response.json,
        }) as unknown as typeof fetch,
    )
}

describe('validateSession', () => {
    beforeEach(() => vi.restoreAllMocks())

    it('sends bearer token and returns the API body on success', async () => {
        mockFetch({ ok: true, status: 200, json: { code: 0, msg: 'ok', data: { ok: true } } })
        const r = await validateSession('tok')
        expect(r).toEqual({ code: 0, msg: 'ok', data: { ok: true } })
        expect(fetch).toHaveBeenCalledWith(
            '/api/v1/admin/session',
            expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
        )
    })

    it('wraps a non-API success body into an ok flag', async () => {
        mockFetch({ ok: true, status: 200, json: { ok: true } })
        const r = await validateSession('tok')
        expect(r.code).toBe(0)
        expect(r.data).toEqual({ ok: true })
    })

    it('returns the API body on auth failure', async () => {
        mockFetch({
            ok: false,
            status: 401,
            json: { code: 401, msg: 'unauthorized', data: { ok: false } },
        })
        const r = await validateSession('tok')
        expect(r).toEqual({ code: 401, msg: 'unauthorized', data: { ok: false } })
    })

    it('uses status + extracted message on a non-API error body', async () => {
        mockFetch({ ok: false, status: 500, json: { message: 'down' } })
        const r = await validateSession('tok')
        expect(r.code).toBe(500)
        expect(r.msg).toBe('down')
        expect(r.data).toEqual({ ok: false })
    })

    it('falls back to a generic server-error message', async () => {
        mockFetch({ ok: false, status: 502, json: null })
        const r = await validateSession('tok')
        expect(r.msg).toBe('服务器错误(502)')
    })

    it('treats an unparseable success body as ok:false', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => {
                    throw new Error('parse')
                },
            }) as unknown as typeof fetch,
        )
        const r = await validateSession('tok')
        expect(r.code).toBe(0)
        expect(r.data).toEqual({ ok: false })
    })
})
