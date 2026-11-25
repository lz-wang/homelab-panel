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
        document.body.replaceChildren()
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

    it('copies the complete text inside the source dialog and restores focus', async () => {
        const dialog = document.createElement('div')
        dialog.setAttribute('role', 'dialog')
        const button = document.createElement('button')
        dialog.append(button)
        const previousFocus = document.createElement('button')
        document.body.append(previousFocus, dialog)
        previousFocus.focus()

        const text = 'first line\nsecond line'
        const execCommand = vi.fn(() => {
            const input = dialog.querySelector('textarea')
            expect(input).toBe(document.activeElement)
            expect(input?.value.slice(input.selectionStart, input.selectionEnd)).toBe(text)
            return true
        })
        setClipboard(undefined)
        setExecCommand(execCommand)

        expect(await copyToClipboard(text, button)).toBe(true)
        expect(execCommand).toHaveBeenCalledWith('copy')
        expect(document.querySelector('textarea')).toBeNull()
        expect(document.activeElement).toBe(previousFocus)
    })

    it('returns false when the temporary input cannot take focus', async () => {
        vi.spyOn(HTMLTextAreaElement.prototype, 'focus').mockImplementation(() => {})
        const execCommand = vi.fn().mockReturnValue(true)
        setClipboard(undefined)
        setExecCommand(execCommand)

        expect(await copyToClipboard('hello')).toBe(false)
        expect(execCommand).not.toHaveBeenCalled()
        expect(document.querySelector('textarea')).toBeNull()
    })

    it('returns false when both methods fail', async () => {
        setClipboard(undefined)
        setExecCommand(vi.fn().mockReturnValue(false))

        const ok = await copyToClipboard('hello')

        expect(ok).toBe(false)
    })
})
