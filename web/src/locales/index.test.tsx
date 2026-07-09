import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useLocaleStore } from '@/store/locale'
import { LANGUAGES, localeTag, t, useTranslation } from './index'

function Probe() {
    const { t } = useTranslation()
    return <div>{t('common.save')}</div>
}

describe('t()', () => {
    it('resolves a dotted key in the active language', () => {
        useLocaleStore.setState({ lang: 'zh-CN' })
        expect(t('common.save')).toBe('保存')
    })

    it('follows language switches', () => {
        useLocaleStore.setState({ lang: 'en' })
        expect(t('common.save')).toBe('Save')
    })

    it('interpolates {param} placeholders', () => {
        useLocaleStore.setState({ lang: 'zh-CN' })
        expect(t('common.deleteConfirmByName', { name: 'Foo' })).toBe('确认删除 Foo？')
    })

    it('returns the key when missing everywhere', () => {
        expect(t('does.not.exist')).toBe('does.not.exist')
    })
})

describe('useTranslation()', () => {
    it('re-renders with the new language on switch', () => {
        useLocaleStore.setState({ lang: 'zh-CN' })
        render(<Probe />)
        expect(screen.getByText('保存')).toBeInTheDocument()
        act(() => useLocaleStore.getState().setLang('en'))
        expect(screen.getByText('Save')).toBeInTheDocument()
    })
})

describe('LANGUAGES', () => {
    it('lists both supported languages with stable labels', () => {
        expect(LANGUAGES.map((l) => l.code)).toEqual(['zh-CN', 'en'])
    })
})

describe('localeTag', () => {
    it('maps codes to Intl locale tags', () => {
        expect(localeTag('zh-CN')).toBe('zh-CN')
        expect(localeTag('en')).toBe('en-US')
    })
})
