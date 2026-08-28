import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppStarter } from './AppStarter'

vi.mock('@/api/files', () => ({
    getList: vi.fn().mockResolvedValue({ code: 0, msg: 'OK', data: { list: [], count: 0 } }),
    uploadFiles: vi.fn(),
    deletes: vi.fn(),
}))

// mock 返回值必须是稳定引用：FileManagerPanel 的 loadFiles 以 notify 为依赖，
// 每次渲染返回新对象会触发无限重载循环，导致「暂无文件」闪烁、断言竞态失败。
const mockNotify = { success: vi.fn(), error: vi.fn() }
const mockConfirm = vi.fn()

vi.mock('@/components/common/NotifyProvider', () => ({
    useNotify: () => mockNotify,
}))

vi.mock('@/components/common/ConfirmProvider', () => ({
    useConfirm: () => mockConfirm,
}))

describe('AppStarter', () => {
    it('默认显示页面设置面板', () => {
        render(<AppStarter open onClose={() => {}} />)

        expect(screen.getByText('设置')).toBeInTheDocument()
        expect(screen.getByText('页面布局')).toBeInTheDocument()
    })

    it('点击文件管理 Tab 立即切换到文件面板', async () => {
        render(<AppStarter open onClose={() => {}} />)

        fireEvent.click(screen.getByText('文件管理'))

        // 面板全部静态打包，点击 Tab 只是组件 mount，不存在 chunk 加载等待。
        expect(await screen.findByText('暂无文件')).toBeInTheDocument()
        expect(screen.queryByText('页面布局')).not.toBeInTheDocument()
    })
})
