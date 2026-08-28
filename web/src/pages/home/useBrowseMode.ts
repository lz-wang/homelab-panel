import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuthStore } from '@/store/auth'

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
 * 浏览模式状态机：读取、切换、持久化、guest 清理集中于此。
 * 认证状态机只在明确验证为 guest 后才能清掉浏览模式；
 * checking（刷新后验证中）与 admin 都不允许改动，
 * 否则刷新瞬间会把刚从 localStorage 恢复的浏览模式清掉。
 */
export function useBrowseMode() {
    const authStatus = useAuthStore((state) => state.status)
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

    useEffect(() => {
        if (authStatus !== 'guest') return

        setBrowsingAsGuest(false)
        persistFlag(false)
    }, [authStatus])

    return { browsingAsGuest, updateBrowsingAsGuest, toggleBrowseMode }
}
