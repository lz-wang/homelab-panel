/**
 * 复制文本到剪贴板。
 *
 * navigator.clipboard 仅在安全上下文（HTTPS / localhost）可用；
 * 在 http://192.168.x.x 等内网 HTTP 环境下为 undefined，因此自动 fallback 到
 * 已废弃但仍被所有浏览器支持的 document.execCommand('copy')。
 *
 * @returns 是否复制成功（用于调用方决定提示文案）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text)
            return true
        } catch {
            // 权限被拒或页面失焦 → 退回 legacy 方案
        }
    }

    if (typeof document.execCommand !== 'function') return false

    try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.top = '0'
        textarea.style.left = '0'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        return ok
    } catch {
        return false
    }
}
