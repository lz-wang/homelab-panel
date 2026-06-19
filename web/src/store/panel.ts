import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { type ApiResponse, API_SUCCESS_CODE } from '@/api/apiResult'
import type { FrontendPanel } from '@/api/adapters'
import { getPanel, savePanel, type PanelDocument } from '@/api/panel'
import background1 from '@/assets/background-1.jpg'
import background2 from '@/assets/background-2.jpg'
import background3 from '@/assets/background-3.jpg'
import background4 from '@/assets/background-4.jpg'
import { PanelPanelConfigStyleEnum } from '@/constants/panel'
import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

const defaultFooterHtml =
    '<div style="display:flex;justify-content:center;color:#cbd5e1;margin-top:100px">Powered By <a href="https://github.com/lz-wang/homelab-panel" target="_blank" style="margin-left:5px">Homelab Panel</a></div>'

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
    }
}

interface PanelStore {
    siteName: string
    panelConfig: PanelConfig
    searchEngine: unknown
    groups: ItemIconGroup[]
    items: ItemInfo[]

    rightSiderCollapsed: boolean
    leftSiderCollapsed: boolean
    panelDataVersion: number

    load: () => Promise<void>
    setPanelConfig: (config: PanelConfig) => ApiResponse | Promise<ApiResponse>
    resetPanelConfig: () => void

    replaceGroups: (groups: ItemIconGroup[]) => Promise<ApiResponse>
    replaceItems: (items: ItemInfo[]) => Promise<ApiResponse>
    upsertGroup: (group: ItemIconGroup) => Promise<ApiResponse>
    deleteGroups: (ids: number[]) => Promise<ApiResponse>
    upsertItem: (item: ItemInfo) => Promise<ApiResponse>
    deleteItems: (ids: number[]) => Promise<ApiResponse>
    addItems: (items: ItemInfo[]) => Promise<ApiResponse>
    setSiteName: (name: string) => Promise<ApiResponse>
}

function docFromState(s: PanelStore): FrontendPanel {
    return {
        siteName: s.siteName,
        config: s.panelConfig,
        searchEngine: s.searchEngine,
        groups: s.groups,
        items: s.items,
    }
}

export const usePanelStore = create<PanelStore>()(
    persist(
        (set, get) => ({
            siteName: 'Homelab Panel',
            panelConfig: defaultPanelConfig(),
            searchEngine: {},
            groups: [],
            items: [],

            rightSiderCollapsed: false,
            leftSiderCollapsed: false,
            panelDataVersion: 0,

            load: async () => {
                const res = await getPanel()
                if (res.code === 0 && res.data) {
                    set({
                        siteName: res.data.siteName,
                        panelConfig: { ...defaultPanelConfig(), ...res.data.config },
                        searchEngine: res.data.searchEngine,
                        groups: res.data.groups,
                        items: res.data.items,
                        panelDataVersion: get().panelDataVersion + 1,
                    })
                }
            },

            setPanelConfig: (panelConfig) => {
                set({ panelConfig: { ...defaultPanelConfig(), ...panelConfig } })
                return persistPanel(get, set, { panelConfig })
            },
            resetPanelConfig: () => set({ panelConfig: defaultPanelConfig() }),

            replaceGroups: (groups) => persistPanel(get, set, { groups }),
            replaceItems: (items) => persistPanel(get, set, { items }),

            upsertGroup: (group) => {
                const prior = get().groups
                const exists = Boolean(group.id && prior.some((g) => g.id === group.id))
                const groups = exists
                    ? prior.map((g) => (g.id === group.id ? { ...g, ...group } : g))
                    : [...prior, group]
                return persistPanel(get, set, { groups })
            },
            deleteGroups: (ids) => {
                const idSet = new Set(ids)
                const groups = get().groups.filter((g) => !g.id || !idSet.has(g.id))
                const items = get().items.filter(
                    (it) => !it.itemIconGroupId || !idSet.has(it.itemIconGroupId),
                )
                return persistPanel(get, set, { groups, items })
            },

            upsertItem: (item) => {
                const prior = get().items
                const exists = Boolean(item.id && prior.some((it) => it.id === item.id))
                const items = exists
                    ? prior.map((it) => (it.id === item.id ? { ...it, ...item } : it))
                    : [...prior, item]
                return persistPanel(get, set, { items })
            },
            deleteItems: (ids) => {
                const idSet = new Set(ids)
                const items = get().items.filter((it) => !it.id || !idSet.has(it.id))
                return persistPanel(get, set, { items })
            },
            addItems: (incoming) => {
                const items = [...get().items, ...incoming]
                return persistPanel(get, set, { items })
            },

            setSiteName: (name) => persistPanel(get, set, { siteName: name }),
        }),
        {
            name: 'panelStorage',
            partialize: (state) => ({
                rightSiderCollapsed: state.rightSiderCollapsed,
                leftSiderCollapsed: state.leftSiderCollapsed,
                panelConfig: state.panelConfig,
            }),
        },
    ),
)

async function persistPanel(
    get: () => PanelStore,
    set: (partial: Partial<PanelStore>) => void,
    optimistic: Partial<PanelStore>,
): Promise<ApiResponse> {
    set(optimistic)
    const res = await savePanel(docFromState({ ...get(), ...optimistic }) as PanelDocument)
    if (res.code === API_SUCCESS_CODE && res.data) {
        set({
            siteName: res.data.siteName,
            groups: res.data.groups,
            items: res.data.items,
            panelDataVersion: get().panelDataVersion + 1,
        })
        return res
    }
    await get().load()
    return res
}
