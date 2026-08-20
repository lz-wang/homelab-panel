import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { validateSession } from '@/api/session'

export type AuthStatus = 'checking' | 'guest' | 'admin'

interface AuthState {
    token: string | null
    status: AuthStatus
    /** 登录成功后写入 token 并进入 admin 状态。 */
    setToken: (token: string) => void
    clearToken: () => void
    bootstrapAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            // 启动默认 checking：有 token 需要向后端验证，验证期间不显示管理入口。
            status: 'checking',
            setToken: (token) => set({ token, status: 'admin' }),
            clearToken: () => set({ token: null, status: 'guest' }),
            bootstrapAuth: async () => {
                // 始终公开：面板无需登录即可加载；有 token 时先向后端确认是否仍有效。
                const token = useAuthStore.getState().token

                if (!token) {
                    set({ status: 'guest' })
                    return
                }

                set({ status: 'checking' })

                try {
                    const res = await validateSession(token)

                    if (res.code === 0 && res.data.ok) {
                        set({ status: 'admin' })
                        return
                    }
                } catch {
                    // 网络或解析异常按未登录处理，避免显示管理入口。
                }

                set({ token: null, status: 'guest' })
            },
        }),
        {
            name: 'AUTH_TOKEN',
            partialize: (state) => ({ token: state.token }),
        },
    ),
)
