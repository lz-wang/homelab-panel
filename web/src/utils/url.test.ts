import { describe, expect, it } from 'vitest'

import { isValidUrl, normalizeUrl, titleFromUrl } from '@/utils/url'

describe('url utilities', () => {
  it('normalizes blank and protocol-less URLs', () => {
    expect(normalizeUrl('')).toBe('')
    expect(normalizeUrl(' example.com ')).toBe('https://example.com')
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  it('validates normalized URLs', () => {
    expect(isValidUrl(normalizeUrl('example.com'))).toBe(true)
    expect(isValidUrl('not a url')).toBe(false)
  })

  it('builds a title from the hostname', () => {
    expect(titleFromUrl('https://www.example.com/path')).toBe('example.com')
    expect(titleFromUrl('bad url')).toBe('bad url')
  })
})
