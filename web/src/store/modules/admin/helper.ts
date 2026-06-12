// import { ss } from '@/utils/storage'

// const LOCAL_NAME = 'appSetting'

export type Theme = 'light' | 'dark' | 'auto'

export interface AdminState {
  siderCollapsed: boolean
  theme: Theme
}

export function defaultSetting(): AdminState {
  return { siderCollapsed: false, theme: 'light' }
}

// export function getLocalSetting(): AdminState {
//   const localSetting: AdminState | undefined = ss.get(LOCAL_NAME)
//   return { ...defaultSetting(), ...localSetting }
// }

// export function setLocalSetting(setting: AdminState): void {
//   ss.set(LOCAL_NAME, setting)
// }
