import { describe, expect, it } from 'vitest'

import { reorder } from '@/pages/home/utils'

describe('home utilities', () => {
    it('reorders a copy without mutating the source list', () => {
        const source = ['a', 'b', 'c']

        expect(reorder(source, 0, 2)).toEqual(['b', 'c', 'a'])
        expect(source).toEqual(['a', 'b', 'c'])
    })
})
