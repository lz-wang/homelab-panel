import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validateSession } from '@/api/session'
import { useAuthStore } from '@/store/auth'

vi.mock('@/api/session', () => ({
    validateSession: vi.fn(),
}))

const validateSessionMock = vi.mocked(validateSession)

describe('auth store', () => {
    beforeEach(() => {
        validateSessionMock.mockReset()
        localStorage.clear()
        useAuthStore.setState({ token: null, status: 'checking' })
    })

    it('无 token 时初始化为访客状态', async () => {
        await useAuthStore.getState().bootstrapAuth()

        expect(validateSessionMock).not.toHaveBeenCalled()
        expect(useAuthStore.getState()).toMatchObject({
            token: null,
            status: 'guest',
        })
    })

    it('token 校验成功时进入管理状态', async () => {
        useAuthStore.setState({ token: 'valid-token', status: 'checking' })
        validateSessionMock.mockResolvedValue({ code: 0, msg: 'OK', data: { ok: true } })

        await useAuthStore.getState().bootstrapAuth()

        expect(validateSessionMock).toHaveBeenCalledWith('valid-token')
        expect(useAuthStore.getState()).toMatchObject({
            token: 'valid-token',
            status: 'admin',
        })
    })

    it('token 校验失败时清空登录状态', async () => {
        useAuthStore.setState({ token: 'expired-token', status: 'checking' })
        validateSessionMock.mockResolvedValue({
            code: 401,
            msg: 'invalid or missing admin token',
            data: { ok: false },
        })

        await useAuthStore.getState().bootstrapAuth()

        expect(validateSessionMock).toHaveBeenCalledWith('expired-token')
        expect(useAuthStore.getState()).toMatchObject({
            token: null,
            status: 'guest',
        })
    })
})
