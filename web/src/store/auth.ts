import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { VisitMode } from '@/constants/auth'
import type { UserInfo } from '@/types/user'

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  visitMode: VisitMode
  initialized: boolean
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo | null) => void
  setVisitMode: (visitMode: VisitMode) => void
  setInitialized: (initialized: boolean) => void
  removeToken: () => void
  isLoggedIn: () => boolean
  isAdmin: () => boolean
  bootstrapAuth: () => Promise<void>
}

const defaultState = {
  token: null,
  userInfo: null,
  visitMode: VisitMode.VISIT_MODE_LOGIN,
  initialized: false,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...defaultState,
      setToken: token => set({ token }),
      setUserInfo: userInfo => set({ userInfo }),
      setVisitMode: visitMode => set({ visitMode }),
      setInitialized: initialized => set({ initialized }),
      removeToken: () => set({ token: null, userInfo: null, visitMode: VisitMode.VISIT_MODE_LOGIN }),
      isLoggedIn: () => Boolean(get().token && get().userInfo),
      isAdmin: () => get().userInfo?.role === 'admin',
      bootstrapAuth: async () => {
        try {
          const { getAuthInfo, getInfo } = await import('@/api/user')
          const token = get().token

          if (token) {
            const userRes = await getInfo()

            if (userRes.code === 0) {
              set({
                userInfo: userRes.data,
                visitMode: VisitMode.VISIT_MODE_LOGIN,
                initialized: true,
              })
              return
            }

            set({ token: null, userInfo: null })
          }

          const authRes = await getAuthInfo()

          if (authRes.code === 0) {
            set({
              userInfo: authRes.data.user,
              visitMode: authRes.data.visitMode,
              initialized: true,
            })
            return
          }
        }
        catch {
          // Fall through to the login-required state.
        }

        set({
          userInfo: null,
          visitMode: VisitMode.VISIT_MODE_LOGIN,
          initialized: true,
        })
      },
    }),
    {
      name: 'AUTH_TOKEN',
      partialize: state => ({
        token: state.token,
        userInfo: state.userInfo,
        visitMode: state.visitMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setInitialized(false)
      },
    },
  ),
)
