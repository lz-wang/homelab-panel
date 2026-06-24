import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/request', () => ({
    post: vi.fn(),
    del: vi.fn(),
    put: vi.fn(),
}))

import { changePassword, login, logout } from '@/api/admin'
import { del, post, put } from '@/api/request'

describe('admin api', () => {
    it('login posts the password to /admin/session', () => {
        vi.mocked(post).mockReturnValue('login-res' as never)
        expect(login('pw')).toBe('login-res')
        expect(post).toHaveBeenCalledWith({ url: '/admin/session', data: { password: 'pw' } })
    })

    it('logout deletes /admin/session', () => {
        vi.mocked(del).mockReturnValue('logout-res' as never)
        expect(logout()).toBe('logout-res')
        expect(del).toHaveBeenCalledWith({ url: '/admin/session' })
    })

    it('changePassword puts snake_case fields to /admin/password', () => {
        vi.mocked(put).mockReturnValue('pw-res' as never)
        expect(changePassword('old', 'new')).toBe('pw-res')
        expect(put).toHaveBeenCalledWith({
            url: '/admin/password',
            data: { old_password: 'old', new_password: 'new' },
        })
    })
})
