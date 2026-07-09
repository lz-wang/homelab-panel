import { beforeEach, describe, expect, it, vi } from 'vitest'

import { detectInitialLang, useLocaleStore } from './locale'

describe('detectInitialLang', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('prefers a supported stored value', () => {
        localStorage.setItem('homelab-lang', 'en')
        expect(detectInitialLang()).toBe('en')
    })

    it('ignores an unsupported stored value and falls back to navigator', () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('zh-CN')
        localStorage.setItem('homelab-lang', 'fr')
        expect(detectInitialLang()).toBe('zh-CN')
    })

    it('maps any zh* navigator language to zh-CN', () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('zh-TW')
        expect(detectInitialLang()).toBe('zh-CN')
    })

    it('maps a non-zh navigator language to en', () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
        expect(detectInitialLang()).toBe('en')
    })

    it('defaults to zh-CN when navigator is empty', () => {
        vi.spyOn(navigator, 'language', 'get').mockReturnValue('')
        expect(detectInitialLang()).toBe('zh-CN')
    })
})

describe('useLocaleStore', () => {
    beforeEach(() => {
        localStorage.clear()
        useLocaleStore.setState({ lang: 'zh-CN' })
    })

    it('setLang updates state and persists to localStorage', () => {
        useLocaleStore.getState().setLang('en')
        expect(useLocaleStore.getState().lang).toBe('en')
        expect(localStorage.getItem('homelab-lang')).toBe('en')
    })
})
