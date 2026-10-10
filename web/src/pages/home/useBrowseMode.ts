import { useCallback, useRef, useState } from 'react'

// 浏览模式（已登录管理员临时切到只读）是否开启，持久化以在刷新后保持。
const BROWSING_AS_GUEST_KEY = 'homelab-panel:browsing-as-guest'

function readStoredFlag() {
    try {
        return localStorage.getItem(BROWSING_AS_GUEST_KEY) === '1'
    } catch {
        return false
    }
}

function persistFlag(enabled: boolean) {
    try {
        if (enabled) localStorage.setItem(BROWSING_AS_GUEST_KEY, '1')
        else localStorage.removeItem(BROWSING_AS_GUEST_KEY)
    } catch {
        // localStorage 不可用时静默忽略
    }
}

/**
 * 浏览模式是用户选择，独立于认证状态持久化。
 * 会话校验失败或重新登录不能重置该选择；退出登录时由调用方显式清除。
 * 编辑权限仍由 Home 根据认证状态单独判断。
 */
export function useBrowseMode() {
    const [browsingAsGuest, setBrowsingAsGuest] = useState(readStoredFlag)

    // 显式 setter：状态与 localStorage 同步更新，
    // 不再依赖 effect 异步持久化（logout 后立即 navigate 时时序不确定）。
    const updateBrowsingAsGuest = useCallback((enabled: boolean) => {
        setBrowsingAsGuest(enabled)
        persistFlag(enabled)
    }, [])

    // render 期间同步最新值，供事件回调读取，避免在 setState updater 里做副作用。
    const browsingRef = useRef(browsingAsGuest)
    browsingRef.current = browsingAsGuest

    const toggleBrowseMode = useCallback(() => {
        updateBrowsingAsGuest(!browsingRef.current)
    }, [updateBrowsingAsGuest])

    return { browsingAsGuest, updateBrowsingAsGuest, toggleBrowseMode }
}
