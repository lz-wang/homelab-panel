import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { HomeContextMenu, type HomeContextMenuState } from './HomeContextMenu'

vi.mock('@mui/material/Menu', () => ({
    default: ({ children, open }: { children: ReactNode; open: boolean }) => (
        <div>{open ? children : null}</div>
    ),
}))

vi.mock('@mui/material/MenuItem', () => ({
    default: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
        <button onClick={onClick}>{children}</button>
    ),
}))

const contextMenu: HomeContextMenuState = {
    mouseX: 10,
    mouseY: 20,
    item: {
        id: 1,
        icon: null,
        title: '应用',
        url: 'https://example.com',
        openMethod: 2,
        itemIconGroupId: 1,
    },
}

describe('HomeContextMenu', () => {
    it('未登录时不展示编辑和删除菜单项', () => {
        render(
            <HomeContextMenu
                contextMenu={contextMenu}
                canManage={false}
                onClose={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        )

        expect(screen.queryByText('编辑')).not.toBeInTheDocument()
        expect(screen.queryByText('删除')).not.toBeInTheDocument()
    })

    it('可管理时展示编辑和删除菜单项', () => {
        render(
            <HomeContextMenu
                contextMenu={contextMenu}
                canManage
                onClose={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        )

        expect(screen.getByText('编辑')).toBeInTheDocument()
        expect(screen.getByText('删除')).toBeInTheDocument()
    })
})
