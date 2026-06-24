import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { HomeFloatingActions } from './HomeFloatingActions'

vi.mock('@mui/material/Tooltip', () => ({
    default: ({ children, title }: { children: ReactNode; title: string }) => (
        <span title={title}>{children}</span>
    ),
}))

function clickTooltipButton(title: string) {
    const button = screen.getByTitle(title).querySelector('button')
    if (!button) throw new Error(`Button not found for tooltip: ${title}`)
    fireEvent.click(button)
}

describe('HomeFloatingActions', () => {
    it('未登录时只显示登录按钮', () => {
        const onLogin = vi.fn()
        const onOpenSettings = vi.fn()
        const onToggleBrowseMode = vi.fn()
        const onLogout = vi.fn()

        render(
            <HomeFloatingActions
                canManage={false}
                browsingAsGuest={false}
                onLogin={onLogin}
                onOpenSettings={onOpenSettings}
                onToggleBrowseMode={onToggleBrowseMode}
                onLogout={onLogout}
            />,
        )

        clickTooltipButton('登录')

        expect(onLogin).toHaveBeenCalledTimes(1)
        expect(screen.queryByTitle('设置')).not.toBeInTheDocument()
    })

    it('可管理时显示悬浮操作按钮组', () => {
        const onLogin = vi.fn()
        const onOpenSettings = vi.fn()
        const onToggleBrowseMode = vi.fn()
        const onLogout = vi.fn()

        render(
            <HomeFloatingActions
                canManage
                browsingAsGuest={false}
                onLogin={onLogin}
                onOpenSettings={onOpenSettings}
                onToggleBrowseMode={onToggleBrowseMode}
                onLogout={onLogout}
            />,
        )

        clickTooltipButton('设置')
        clickTooltipButton('切换到浏览模式')
        clickTooltipButton('登出')

        expect(onOpenSettings).toHaveBeenCalledTimes(1)
        expect(onToggleBrowseMode).toHaveBeenCalledTimes(1)
        expect(onLogout).toHaveBeenCalledTimes(1)
        expect(screen.queryByTitle('登录')).not.toBeInTheDocument()
    })
})
