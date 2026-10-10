import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validateSession } from '@/api/session'
import { useAuthStore } from '@/store/auth'

import { useBrowseMode } from './useBrowseMode'

const BROWSING_AS_GUEST_KEY = 'homelab-panel:browsing-as-guest'

vi.mock('@/api/session', () => ({ validateSession: vi.fn() }))

describe('useBrowseMode', () => {
    beforeEach(() => {
        vi.mocked(validateSession).mockReset()
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

    it('checking → guest 保留浏览模式与 localStorage', () => {
        localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
        const { result } = renderHook(() => useBrowseMode())

        act(() => {
            useAuthStore.setState({ status: 'guest' })
        })

        expect(result.current.browsingAsGuest).toBe(true)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBe('1')
    })

    it('guest 状态下初始渲染保留浏览模式选择', () => {
        localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
        useAuthStore.setState({ status: 'guest' })

        const { result } = renderHook(() => useBrowseMode())

        expect(result.current.browsingAsGuest).toBe(true)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBe('1')
    })

    it.each([
        'success',
        'network failure',
    ] as const)('登录后切到浏览模式，刷新并校验会话（%s）后仍保持浏览模式', async (validation) => {
        useAuthStore.getState().setToken('valid-token')
        const first = renderHook(() => useBrowseMode())
        act(() => first.result.current.toggleBrowseMode())
        first.unmount()

        useAuthStore.setState({ status: 'checking' })
        const refreshed = renderHook(() => useBrowseMode())
        expect(refreshed.result.current.browsingAsGuest).toBe(true)

        if (validation === 'success') {
            vi.mocked(validateSession).mockResolvedValue({
                code: 0,
                msg: 'OK',
                data: { ok: true },
            })
        } else {
            vi.mocked(validateSession).mockRejectedValue(new Error('offline'))
        }

        await act(async () => {
            await useAuthStore.getState().bootstrapAuth()
        })
        expect(refreshed.result.current.browsingAsGuest).toBe(true)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBe('1')

        act(() => useAuthStore.getState().setToken('new-token'))
        expect(refreshed.result.current.browsingAsGuest).toBe(true)

        // Home 的退出登录操作显式清除模式选择。
        act(() => {
            useAuthStore.getState().clearToken()
            refreshed.result.current.updateBrowsingAsGuest(false)
        })
        expect(refreshed.result.current.browsingAsGuest).toBe(false)
        expect(localStorage.getItem(BROWSING_AS_GUEST_KEY)).toBeNull()
    })
})
