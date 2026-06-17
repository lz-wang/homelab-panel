import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      setToken: token => set({ token }),
      setAdmin: isAdmin => set({ isAdmin }),
      setInitialized: initialized => set({ initialized }),
      clearToken: () => set({ token: null, isAdmin: false }),
      bootstrapAuth: async () => {
        // 始终公开：面板无需登录即可加载；此处仅置 initialized，
        // token 是否有效在调用受保护接口时按 401 处理（apiResult.handleLoginExpiration 会清 token）。
        set({ initialized: true, isAdmin: Boolean(useAuthStore.getState().token) })
      },
    }),
    {
      name: 'AUTH_TOKEN',
      partialize: state => ({ token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setInitialized(false)
      },
    },
  ),
)
