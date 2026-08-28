import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IconifyIcon } from './IconifyIcon'

const testSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>'

function svgResponse() {
    return {
        ok: true,
        text: async () => testSVG,
    }
}

describe('IconifyIcon', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('同名图标的多个实例并发渲染只发起一次请求', async () => {
        fetchMock.mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 20, svgResponse())),
        )

        const first = render(<IconifyIcon icon="mdi:dedupe-a" />)
        const second = render(<IconifyIcon icon="mdi:dedupe-a" />)

        await waitFor(() => {
            expect(first.container.querySelector('svg')).toBeInTheDocument()
            expect(second.container.querySelector('svg')).toBeInTheDocument()
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledWith('/api/v1/icons/mdi%3Adedupe-a')
    })

    it('组件卸载不中断共享请求，结果进入缓存供下次挂载复用', async () => {
        let resolveFetch: (value: unknown) => void = () => {}
        fetchMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve
                }),
        )

        const { unmount } = render(<IconifyIcon icon="mdi:unmount-b" />)
        expect(fetchMock).toHaveBeenCalledTimes(1)
        unmount()

        // 卸载后请求仍完成，解析结果写入模块级缓存。
        resolveFetch(svgResponse())
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

        const again = render(<IconifyIcon icon="mdi:unmount-b" />)
        await waitFor(() => {
            expect(again.container.querySelector('svg')).toBeInTheDocument()
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('请求失败不写入缓存，下次挂载可重试', async () => {
        fetchMock.mockResolvedValue({ ok: false, text: async () => '' })

        const failed = render(<IconifyIcon icon="mdi:retry-c" />)
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
        failed.unmount()

        fetchMock.mockResolvedValue(svgResponse())
        const retried = render(<IconifyIcon icon="mdi:retry-c" />)
        await waitFor(() => {
            expect(retried.container.querySelector('svg')).toBeInTheDocument()
        })
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
