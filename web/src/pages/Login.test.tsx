import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store/auth'

import Login from './Login'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}))

vi.mock('@/hooks/useApiAction', () => ({
    useApiAction: () => ({ loading: false, run: vi.fn() }),
}))

describe('Login', () => {
    beforeEach(() => {
        mockNavigate.mockReset()
        localStorage.clear()
        useAuthStore.setState({ token: null, status: 'guest' })
    })

    it('点击「仅浏览」跳转首页且不写入登录态', () => {
        render(<Login />)

        fireEvent.click(screen.getByRole('button', { name: '仅浏览' }))

        expect(mockNavigate).toHaveBeenCalledWith('/')
        expect(mockNavigate).toHaveBeenCalledTimes(1)
        expect(useAuthStore.getState().token).toBeNull()
        expect(useAuthStore.getState().status).toBe('guest')
    })

    it('不再展示 Powered By 页脚文本', () => {
        render(<Login />)

        expect(screen.queryByText(/Powered By/i)).not.toBeInTheDocument()
    })
})
