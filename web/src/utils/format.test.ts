import { describe, expect, it } from 'vitest'

import { formatBytes, percent } from '@/utils/format'

describe('format utilities', () => {
    it('normalizes percentage values for progress bars', () => {
        expect(percent()).toBe(0)
        expect(percent(Number.NaN)).toBe(0)
        expect(percent(-4)).toBe(0)
        expect(percent(42.4)).toBe(42)
        expect(percent(42.6)).toBe(43)
        expect(percent(120)).toBe(100)
    })

    it('formats bytes with stable units', () => {
        expect(formatBytes()).toBe('0 B')
        expect(formatBytes(0)).toBe('0 B')
        expect(formatBytes(512)).toBe('512 B')
        expect(formatBytes(1024)).toBe('1.0 KB')
        expect(formatBytes(10 * 1024)).toBe('10 KB')
        expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    })
})
