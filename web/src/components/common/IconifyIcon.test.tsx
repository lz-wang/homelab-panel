import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ItemIcon as ItemIconType } from '@/types/panel'

import { IconifyIcon } from './IconifyIcon'
import { ItemIcon } from './ItemIcon'

vi.mock('@iconify/react', () => ({
    Icon: ({ icon, width, height }: { icon: string; width: number; height: number }) => (
        <span data-testid="iconify" data-icon={icon} data-width={width} data-height={height} />
    ),
}))

describe('IconifyIcon', () => {
    it('icon 为空时不渲染任何内容', () => {
        const { container } = render(<IconifyIcon />)

        expect(container).toBeEmptyDOMElement()
    })

    it('把 icon 与 size 透传给 @iconify/react 的 Icon', () => {
        render(<IconifyIcon icon="mdi:server-network" size={32} />)
        const icon = screen.getByTestId('iconify')

        expect(icon).toHaveAttribute('data-icon', 'mdi:server-network')
        expect(icon).toHaveAttribute('data-width', '32')
        expect(icon).toHaveAttribute('data-height', '32')
    })

    it('未传 size 时使用默认 35', () => {
        render(<IconifyIcon icon="mdi:home" />)

        expect(screen.getByTestId('iconify')).toHaveAttribute('data-width', '35')
    })
})

describe('ItemIcon', () => {
    it('经 IconifyIcon 渲染 Iconify 图标', () => {
        const itemIcon: ItemIconType = {
            text: 'mdi:server-network',
            color: '#FFFFFF',
            backgroundColor: '#2196F3',
        }

        render(<ItemIcon itemIcon={itemIcon} />)

        expect(screen.getByTestId('iconify')).toHaveAttribute('data-icon', 'mdi:server-network')
    })

    it('itemIcon 为空时渲染无内容的 Avatar', () => {
        const { container } = render(<ItemIcon itemIcon={null} />)

        expect(screen.queryByTestId('iconify')).not.toBeInTheDocument()
        expect(container.querySelector('.MuiAvatar-root')).toBeInTheDocument()
    })
})
