import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { HomeFloatingActions } from './HomeFloatingActions'

vi.mock('@mui/material/Tooltip', () => ({
    default: ({ children, title }: { children: ReactNode; title: string }) => (
        <span title={title}>{children}</span>
    ),
}))

function getTooltipButton(title: string) {
    const button = screen.getByTitle(title).querySelector('button')
    if (!button) throw new Error(`Button not found for tooltip: ${title}`)
    return button
}

function clickTooltipButton(title: string) {
    fireEvent.click(getTooltipButton(title))
}

function createHandlers() {
    return {
        onLogin: vi.fn(),
        onOpenSettings: vi.fn(),
        onToggleBrowseMode: vi.fn(),
        onLogout: vi.fn(),
    }
}

describe('HomeFloatingActions', () => {
    it('未登录时只显示登录按钮', () => {
        const handlers = createHandlers()

        render(<HomeFloatingActions canManage={false} browsingAsGuest={false} {...handlers} />)

        clickTooltipButton('登录')

        expect(handlers.onLogin).toHaveBeenCalledTimes(1)
        expect(screen.queryByTitle('设置')).not.toBeInTheDocument()
    })

    it('可管理时显示悬浮操作按钮组', () => {
        const handlers = createHandlers()

        render(<HomeFloatingActions canManage browsingAsGuest={false} {...handlers} />)

        clickTooltipButton('设置')
        clickTooltipButton('切换到浏览模式')
        clickTooltipButton('登出')

        expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1)
        expect(handlers.onToggleBrowseMode).toHaveBeenCalledTimes(1)
        expect(handlers.onLogout).toHaveBeenCalledTimes(1)
        expect(screen.queryByTitle('登录')).not.toBeInTheDocument()
    })
})
