import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/store/auth'

import { useBrowseMode } from './useBrowseMode'

const BROWSING_AS_GUEST_KEY = 'homelab-panel:browsing-as-guest'

describe('useBrowseMode', () => {
    beforeEach(() => {
        localStorage.clear()
        useAuthStore.setState({ token: null, status: 'checking' })
    })

    it('初始状态从 localStorage 恢复浏览模式', () => {
        localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')

        const { result } = renderHook(() => useBrowseMode())

        expect(result.current.browsingAsGuest).toBe(true)
    })

    it('updateBrowsingAsGuest 同步持久化 localStorage', () => {
        const { result } = renderHook(() => useBrowseMode())

        act(() => result.current.updateBrowsingAsGuest(true))

        expect(result.current.browsingAsGuest).toBe(true)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBe('1')

        act(() => result.current.updateBrowsingAsGuest(false))

        expect(result.current.browsingAsGuest).toBe(false)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBeNull()
    })

    it('toggleBrowseMode 翻转浏览模式并持久化', () => {
        const { result } = renderHook(() => useBrowseMode())

        act(() => result.current.toggleBrowseMode())

        expect(result.current.browsingAsGuest).toBe(true)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBe('1')

        act(() => result.current.toggleBrowseMode())

        expect(result.current.browsingAsGuest).toBe(false)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBeNull()
    })

    it('checking → admin 不改变浏览模式', () => {
        localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
        const { result } = renderHook(() => useBrowseMode())

        act(() => {
            useAuthStore.setState({ status: 'admin' })
        })

        expect(result.current.browsingAsGuest).toBe(true)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBe('1')
    })

    it('checking → guest 清除浏览模式与 localStorage', () => {
        localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
        const { result } = renderHook(() => useBrowseMode())

        act(() => {
            useAuthStore.setState({ status: 'guest' })
        })

        expect(result.current.browsingAsGuest).toBe(false)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBeNull()
    })

    it('guest 状态下初始渲染也会清掉残留的浏览模式', () => {
        localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
        useAuthStore.setState({ status: 'guest' })

        const { result } = renderHook(() => useBrowseMode())

        expect(result.current.browsingAsGuest).toBe(false)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBeNull()
    })
})
