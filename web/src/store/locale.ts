import { create } from 'zustand'

export type Lang = 'zh-CN' | 'en'

export interface LocaleState {
    lang: Lang
    setLang: (lang: Lang) => void
}

const STORAGE_KEY = 'homelab-lang'
const SUPPORTED: Lang[] = ['zh-CN', 'en']

export function detectInitialLang(): Lang {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored && SUPPORTED.includes(stored as Lang)) return stored as Lang
    } catch {
        // localStorage unavailable (private mode / disabled) — fall through
    }
    const nav = typeof navigator !== 'undefined' ? navigator.language : ''
    if (!nav) return 'zh-CN'
    return nav.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export const useLocaleStore = create<LocaleState>((set) => ({
    lang: detectInitialLang(),
    setLang: (lang) => {
        try {
            localStorage.setItem(STORAGE_KEY, lang)
        } catch {
            // ignore write failure — keep the choice in-memory for this session
        }
        set({ lang })
    },
}))
