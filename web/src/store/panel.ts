import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { getUserConfig } from '@/api/panel/userConfig'
import defaultBackground from '@/assets/defaultBackground.webp'
import { PanelPanelConfigStyleEnum, PanelStateNetworkModeEnum } from '@/constants/panel'
import type { PanelConfig, PanelState } from '@/types/panel'

const defaultFooterHtml = '<div style="display:flex;justify-content:center;color:#cbd5e1;margin-top:100px">Powered By <a href="https://github.com/hslr-s/homelab-panel" target="_blank" style="margin-left:5px">Homelab Panel</a></div>'

export function defaultPanelConfig(): PanelConfig {
  return {
    backgroundImageSrc: defaultBackground,
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
    systemMonitorShow: false,
    systemMonitorShowTitle: true,
    systemMonitorPublicVisitModeShow: false,
    netModeChangeButtonShow: true,
    themeMode: 'system',
    surfaceStyle: 'glass',
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
        const res = await getUserConfig()

        if (res.code === 0) {
          set({
            panelConfig: {
              ...defaultPanelConfig(),
              ...res.data.panel,
            },
          })
        }
        else {
          set({ panelConfig: defaultPanelConfig() })
        }
      },
    }),
    {
      name: 'panelStorage',
    },
  ),
)
