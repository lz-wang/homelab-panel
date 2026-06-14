import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { getUserConfig } from '@/api/panel/userConfig'
import { getPublicHome } from '@/api/public'
import background1 from '@/assets/background-1.jpg'
import background2 from '@/assets/background-2.jpg'
import background3 from '@/assets/background-3.jpg'
import background4 from '@/assets/background-4.jpg'
import { PanelPanelConfigStyleEnum, PanelStateNetworkModeEnum } from '@/constants/panel'
import type { PanelConfig, PanelState } from '@/types/panel'

const defaultFooterHtml = '<div style="display:flex;justify-content:center;color:#cbd5e1;margin-top:100px">Powered By <a href="https://github.com/hslr-s/homelab-panel" target="_blank" style="margin-left:5px">Homelab Panel</a></div>'

export const builtinBackgrounds = [
  { label: '背景 1', src: background1 },
  { label: '背景 2', src: background2 },
  { label: '背景 3', src: background3 },
  { label: '背景 4', src: background4 },
]

export function defaultPanelConfig(): PanelConfig {
  return {
    backgroundImageSrc: background1,
    backgroundBlur: 0,
    backgroundMaskNumber: 0,
    iconStyle: PanelPanelConfigStyleEnum.icon,
    iconTextColor: '#ffffff',
    iconTextInfoHideDescription: false,
    iconTextIconHideTitle: false,
    logoText: 'Homelab Panel',
    logoImageSrc: '',
    clockShowSecond: false,
    searchBoxShow: false,
    searchBoxSearchIcon: false,
    marginBottom: 10,
    marginTop: 10,
    maxWidth: 1200,
    maxWidthUnit: 'px',
    marginX: 5,
    footerHtml: defaultFooterHtml,
    netModeChangeButtonShow: true,
  }
}

interface PanelStore extends PanelState {
  panelDataVersion: number
  setNetworkMode: (mode: PanelStateNetworkModeEnum) => void
  setPanelConfig: (panelConfig: PanelConfig) => void
  patchPanelConfig: (partial: Partial<PanelConfig>) => void
  markPanelDataChanged: () => void
  updatePanelConfigByCloud: () => Promise<void>
  resetPanelConfig: () => void
}

export const usePanelStore = create<PanelStore>()(
  persist(
    set => ({
      rightSiderCollapsed: false,
      leftSiderCollapsed: false,
      networkMode: PanelStateNetworkModeEnum.wan,
      panelConfig: defaultPanelConfig(),
      panelDataVersion: 0,
      setNetworkMode: networkMode => set({ networkMode }),
      setPanelConfig: panelConfig => set({ panelConfig: { ...defaultPanelConfig(), ...panelConfig } }),
      patchPanelConfig: partial => set(state => ({ panelConfig: { ...state.panelConfig, ...partial } })),
      markPanelDataChanged: () => set(state => ({ panelDataVersion: state.panelDataVersion + 1 })),
      resetPanelConfig: () => set({ panelConfig: defaultPanelConfig() }),
      updatePanelConfigByCloud: async () => {
        const { useAuthStore } = await import('@/store/auth')
        const authState = useAuthStore.getState()

        if (authState.token) {
          const res = await getUserConfig()

          if (res.code === 0) {
            set({
              panelConfig: {
                ...defaultPanelConfig(),
                ...res.data.panel,
              },
            })
            return
          }
        }
        else {
          const res = await getPublicHome()

          if (res.code === 0) {
            set({
              panelConfig: {
                ...defaultPanelConfig(),
                ...res.data.config.panel,
              },
            })
            return
          }
        }

        set({ panelConfig: defaultPanelConfig() })
      },
    }),
    {
      name: 'panelStorage',
    },
  ),
)
