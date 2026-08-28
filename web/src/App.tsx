import { useEffect } from 'react'

import { useFavicon } from './hooks/useFavicon'
import { useTranslation } from './locales'
import { AppRouter } from './router/AppRouter'
import { useAuthStore } from './store/auth'

/**
 * 管理员常用窗口在存在登录 token 时立即预加载。
 *
 * 这里故意使用 token 而不是等待 status === 'admin'：刷新页面时可以把
 * session 校验请求与管理窗口 chunk 下载并行起来。管理入口仍由认证状态控制，
 * 因此即使 token 已过期，也只会多一次无害的后台模块下载，不会暴露管理能力。
 */
function preloadAdminWindows() {
    void import('./components/common/EditItemDialog')
    void import('./components/apps/AppStarter').then((module) => {
        // 设置窗口默认打开“页面设置”，一并预加载，避免 shell 已就绪但默认页仍转圈。
        module.preloadSettingsPanel('pageSettings')
    })
}

export default function App() {
    useFavicon()
    const { lang } = useTranslation()
    const authToken = useAuthStore((state) => state.token)

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    useEffect(() => {
        if (!authToken) return

        preloadAdminWindows()
    }, [authToken])

    return <AppRouter />
}
