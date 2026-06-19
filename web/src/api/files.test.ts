import { describe, expect, it } from 'vitest'
import { toFrontendFile } from './files'

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
