import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { VisitMode } from '@/constants/auth'
import type { UserInfo } from '@/types/user'

interface AuthState {
  token: string | null
  userInfo: UserInfo | null
  visitMode: VisitMode
  setToken: (token: string) => void
  setUserInfo: (userInfo: UserInfo) => void
  setVisitMode: (visitMode: VisitMode) => void
  removeToken: () => void
}

const defaultState = {
  token: null,
  userInfo: null,
  visitMode: VisitMode.VISIT_MODE_LOGIN,
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      ...defaultState,
      setToken: token => set({ token }),
      setUserInfo: userInfo => set({ userInfo }),
      setVisitMode: visitMode => set({ visitMode }),
      removeToken: () => set(defaultState),
    }),
    {
      name: 'AUTH_TOKEN',
    },
  ),
)
