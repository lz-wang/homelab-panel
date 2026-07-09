import { type Lang, useLocaleStore } from '@/store/locale'

import en from './en.json'
import zhCN from './zh-CN.json'

type MessageMap = Record<string, unknown>
type MessageParams = Record<string, string | number | boolean | null | undefined>

const messages: Record<Lang, MessageMap> = {
    'zh-CN': zhCN,
    en,
}

export interface LanguageOption {
    code: Lang
    label: string
}

export const LANGUAGES: LanguageOption[] = [
    { code: 'zh-CN', label: '中文' },
    { code: 'en', label: 'English' },
]

function resolve(map: MessageMap, key: string): string {
    const value = key.split('.').reduce<unknown>((acc, name) => {
        if (typeof acc === 'object' && acc !== null) return (acc as MessageMap)[name]
        return undefined
    }, map)
    return typeof value === 'string' ? value : key
}

export function t(key: string, params?: MessageParams): string {
    const lang = useLocaleStore.getState().lang
    let message = resolve(messages[lang], key)
    if (message === key && lang !== 'zh-CN') message = resolve(messages['zh-CN'], key)
    if (params) {
        for (const [name, value] of Object.entries(params)) {
            message = message.replaceAll(`{${name}}`, String(value ?? ''))
        }
    }
    return message
}

export function useTranslation() {
    const lang = useLocaleStore((s) => s.lang)
    return { t, lang }
}

export function localeTag(lang: Lang): string {
    return lang === 'zh-CN' ? 'zh-CN' : 'en-US'
}
