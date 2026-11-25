/**
 * 复制文本到剪贴板。
 *
 * 安全上下文优先使用 Clipboard API。内网 HTTP 等环境尝试使用旧版复制命令。
 *
 * @returns 是否复制成功（用于调用方决定提示文案）
 */
export async function copyToClipboard(text: string, source?: HTMLElement): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // 权限被拒或页面失焦 → 退回 legacy 方案
        }
    }

    if (typeof document.execCommand !== 'function') return false

    const previousFocus = document.activeElement
    // 弹窗会将外部焦点拉回内部。临时输入框必须留在当前弹窗的焦点范围内。
    const container =
        (source ?? previousFocus)?.closest('[role="dialog"], [role="alertdialog"]') ?? document.body
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.readOnly = true
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'

    try {
        container.appendChild(textarea)
        textarea.focus({ preventScroll: true })
        textarea.select()
        if (
            document.activeElement !== textarea ||
            textarea.selectionStart !== 0 ||
            textarea.selectionEnd !== textarea.value.length
        ) {
            return false
        }
        return document.execCommand('copy')
    } catch {
        return false
    } finally {
        textarea.remove()
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
            previousFocus.focus({ preventScroll: true })
        }
    }
}
