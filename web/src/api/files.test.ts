import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/request', () => ({
    post: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
}))

import { del, get, post } from '@/api/request'
import { deletes, getList, toFrontendFile, uploadFiles, uploadImg } from './files'

describe('toFrontendFile', () => {
    it('reads snake_case backend fields', () => {
        const info = toFrontendFile({
            id: 7,
            original_name: 'a.png',
            object_key: 'k',
            url: '/u',
            created_at: '2026-06-19',
        })
        expect(info).toEqual({
            id: 7,
            src: '/u',
            path: '/u',
            fileName: 'a.png',
            createTime: '2026-06-19',
            updateTime: '2026-06-19',
        })
    })

    it('falls back to object_key then url for fileName', () => {
        expect(toFrontendFile({ object_key: 'k', url: '/u' }).fileName).toBe('k')
        expect(toFrontendFile({ url: '/u' }).fileName).toBe('/u')
    })
})

describe('uploadImg', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns imageUrl on success', async () => {
        vi.mocked(post).mockResolvedValue({
            code: 0,
            msg: 'OK',
            data: [{ id: 1, url: '/uploads/a.png', original_name: 'a.png' }],
        })
        const res = await uploadImg(new File(['x'], 'a.png'))
        expect(res.code).toBe(0)
        expect(res.data?.imageUrl).toBe('/uploads/a.png')
    })

    it('returns null data on failure', async () => {
        vi.mocked(post).mockResolvedValue({ code: 1, msg: 'fail', data: [] })
        const res = await uploadImg(new File(['x'], 'a.png'))
        expect(res.code).toBe(1)
        expect(res.data).toBeNull()
    })
})

describe('uploadFiles', () => {
    beforeEach(() => vi.clearAllMocks())

    it('builds succMap from uploaded files', async () => {
        vi.mocked(post).mockResolvedValue({
            code: 0,
            msg: 'OK',
            data: [
                { original_name: 'a.png', url: '/u/a' },
                { original_name: 'b.png', url: '/u/b' },
            ],
        })
        const res = await uploadFiles([new File(['x'], 'a.png'), new File(['y'], 'b.png')])
        expect(res.data?.succMap).toEqual({ 'a.png': '/u/a', 'b.png': '/u/b' })
        expect(res.data?.errFiles).toEqual([])
    })

    it('returns null data on failure', async () => {
        vi.mocked(post).mockResolvedValue({ code: 1, msg: 'fail', data: [] })
        const res = await uploadFiles([new File(['x'], 'a.png')])
        expect(res.data).toBeNull()
    })
})

describe('getList', () => {
    beforeEach(() => vi.clearAllMocks())

    it('maps backend files to a frontend list', async () => {
        vi.mocked(get).mockResolvedValue({
            code: 0,
            msg: 'OK',
            data: [{ id: 1, url: '/u', original_name: 'a.png' }],
        })
        const res = await getList()
        expect(res.data?.count).toBe(1)
        expect(res.data?.list[0]).toMatchObject({ id: 1, src: '/u', fileName: 'a.png' })
    })

    it('returns an empty list on failure', async () => {
        vi.mocked(get).mockResolvedValue({ code: 1, msg: 'fail', data: [] })
        const res = await getList()
        expect(res.data?.list).toEqual([])
        expect(res.data?.count).toBe(0)
    })
})

describe('deletes', () => {
    beforeEach(() => vi.clearAllMocks())

    it('deletes each id and returns ok when all succeed', async () => {
        vi.mocked(del).mockResolvedValue({ code: 0, msg: 'OK', data: undefined })
        const res = await deletes([1, 2])
        expect(res.code).toBe(0)
        expect(del).toHaveBeenCalledTimes(2)
    })

    it('stops and returns the failing result', async () => {
        vi.mocked(del)
            .mockResolvedValueOnce({ code: 0, msg: 'OK', data: undefined })
            .mockResolvedValueOnce({ code: 1, msg: 'fail', data: undefined })
        const res = await deletes([1, 2])
        expect(res.code).toBe(1)
    })

    it('returns ok for an empty id list', async () => {
        const res = await deletes([])
        expect(res.code).toBe(0)
        expect(del).not.toHaveBeenCalled()
    })
})
