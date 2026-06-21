import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyToClipboard } from './clipboard'

function setClipboard(value: unknown) {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

function setExecCommand(value: (() => boolean) | undefined) {
    Object.defineProperty(document, 'execCommand', {
        value,
        configurable: true,
        writable: true,
    })
}

describe('copyToClipboard', () => {
    afterEach(() => {
        setClipboard(undefined)
        setExecCommand(undefined)
        vi.restoreAllMocks()
    })

    it('uses navigator.clipboard.writeText when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        setClipboard({ writeText })

        const ok = await copyToClipboard('hello')

        expect(writeText).toHaveBeenCalledWith('hello')
        expect(ok).toBe(true)
    })

    it('falls back to execCommand when clipboard API is missing (HTTP insecure context)', async () => {
        // 模拟 http://192.168.x.x：非安全上下文下 navigator.clipboard 为 undefined
        setClipboard(undefined)
        const execCommand = vi.fn().mockReturnValue(true)
        setExecCommand(execCommand)

        const ok = await copyToClipboard('hello')

        expect(execCommand).toHaveBeenCalledWith('copy')
        expect(ok).toBe(true)
    })

    it('falls back when navigator.clipboard.writeText rejects', async () => {
        const writeText = vi.fn().mockRejectedValue(new Error('denied'))
        setClipboard({ writeText })
        const execCommand = vi.fn().mockReturnValue(true)
        setExecCommand(execCommand)

        const ok = await copyToClipboard('hello')

        expect(execCommand).toHaveBeenCalledWith('copy')
        expect(ok).toBe(true)
    })

    it('returns false when both methods fail', async () => {
        setClipboard(undefined)
        setExecCommand(vi.fn().mockReturnValue(false))

        const ok = await copyToClipboard('hello')

        expect(ok).toBe(false)
    })
})
