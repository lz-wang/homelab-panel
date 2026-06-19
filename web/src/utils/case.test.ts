import { describe, expect, it } from 'vitest'
import { keysToCamel, keysToSnake } from './case'

describe('keysToSnake', () => {
    it('converts top-level camelCase keys', () => {
        expect(keysToSnake({ siteName: 'x', marginTop: 3 })).toEqual({
            site_name: 'x',
            margin_top: 3,
        })
    })

    it('converts nested objects and arrays', () => {
        const input = { group: { itemIconGroupId: 1 }, items: [{ openMethod: 'new_tab' }] }
        expect(keysToSnake(input)).toEqual({
            group: { item_icon_group_id: 1 },
            items: [{ open_method: 'new_tab' }],
        })
    })

    it('handles the lanUrl boundary', () => {
        expect(keysToSnake({ lanUrl: 'http://x' })).toEqual({ lan_url: 'http://x' })
    })

    it('does not mutate the input', () => {
        const input = { siteName: 'x' }
        keysToSnake(input)
        expect(input).toEqual({ siteName: 'x' })
    })

    it('leaves non-object values untouched', () => {
        expect(keysToSnake('hello' as unknown)).toBe('hello')
        expect(keysToSnake(42 as unknown)).toBe(42)
        expect(keysToSnake(null as unknown)).toBe(null)
    })
})

describe('keysToCamel', () => {
    it('converts snake_case keys back to camelCase', () => {
        expect(keysToCamel({ site_name: 'x', margin_top: 3 })).toEqual({
            siteName: 'x',
            marginTop: 3,
        })
    })

    it('is the inverse of keysToSnake for nested data', () => {
        const original = {
            panel: { backgroundImageSrc: 'a', searchBoxShow: true },
            list: [{ groupId: 1 }],
        }
        expect(keysToCamel(keysToSnake(original))).toEqual(original)
    })
})
