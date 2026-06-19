import { describe, expect, it } from 'vitest'

import { handleLoginExpiration } from '@/api/apiResult'
import { useAuthStore } from '@/store/auth'

describe('apiResult', () => {
    it('认证失效时清空登录状态', () => {
        useAuthStore.setState({ token: 'expired-token', isAdmin: true, initialized: true })
        window.location.hash = '#/'

        handleLoginExpiration({ code: 401, msg: 'unauthorized', data: null })

        expect(useAuthStore.getState().token).toBeNull()
        expect(useAuthStore.getState().isAdmin).toBe(false)
        expect(window.location.hash).toBe('#/login')
    })
})
