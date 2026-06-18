import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ColorModeSelector } from '@/components/apps/ColorModeSelector'

const { setMode } = vi.hoisted(() => ({ setMode: vi.fn() }))

vi.mock('@mui/material/styles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mui/material/styles')>()
  return {
    ...actual,
    useColorScheme: () => ({ mode: 'system', setMode }),
  }
})

describe('colorModeSelector', () => {
  beforeEach(() => {
    setMode.mockReset()
  })

  it('渲染 跟随设备/亮色/暗色 三个按钮', () => {
    render(<ColorModeSelector />)
    expect(screen.getByRole('button', { name: '跟随设备' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '亮色' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '暗色' })).toBeInTheDocument()
  })

  it('点击亮色按钮调用 setMode("light")', () => {
    render(<ColorModeSelector />)
    fireEvent.click(screen.getByRole('button', { name: '亮色' }))
    expect(setMode).toHaveBeenCalledWith('light')
  })

  it('点击跟随设备按钮调用 setMode("system")', () => {
    render(<ColorModeSelector />)
    fireEvent.click(screen.getByRole('button', { name: '跟随设备' }))
    expect(setMode).toHaveBeenCalledWith('system')
  })
})
