import { useEffect } from 'react'

import { useAuthStore } from '@/store/auth'

interface Props {
    children: React.ReactNode
}

/**
 * 启动副作用：验证已保存的 token 是否仍有效。
 * 不再作为应用门禁——公开首页与认证验证并行，避免认证 RTT 阻塞首屏。
 */
export function AuthBootstrap({ children }: Props) {
    const bootstrapAuth = useAuthStore((s) => s.bootstrapAuth)

    useEffect(() => {
        void bootstrapAuth()
    }, [bootstrapAuth])

    return children
}
