import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { validateSession } from '@/api/session'

interface AuthState {
    token: string | null
    isAdmin: boolean
    initialized: boolean
    setToken: (token: string) => void
    setAdmin: (admin: boolean) => void
    setInitialized: (initialized: boolean) => void
    clearToken: () => void
    bootstrapAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            isAdmin: false,
            initialized: false,
            setToken: (token) => set({ token }),
            setAdmin: (isAdmin) => set({ isAdmin }),
            setInitialized: (initialized) => set({ initialized }),
            clearToken: () => set({ token: null, isAdmin: false }),
            bootstrapAuth: async () => {
                // 始终公开：面板无需登录即可加载；有 token 时先向后端确认是否仍有效。
                const token = useAuthStore.getState().token

                if (!token) {
                    set({ initialized: true, isAdmin: false })
                    return
                }

                try {
                    const res = await validateSession(token)

                    if (res.code === 0 && res.data.ok) {
                        set({ initialized: true, isAdmin: true })
                        return
                    }
                } catch {
                    // 网络或解析异常按未登录处理，避免显示管理入口。
                }

                set({ token: null, isAdmin: false, initialized: true })
            },
        }),
        {
            name: 'AUTH_TOKEN',
            partialize: (state) => ({ token: state.token }),
            onRehydrateStorage: () => (state) => {
                state?.setInitialized(false)
            },
        },
    ),
)
