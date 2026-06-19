import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { type ApiResponse, API_SUCCESS_CODE } from '@/api/apiResult'
import type { FrontendPanel } from '@/api/adapters'
import { getPanel, savePanel, type PanelDocument } from '@/api/panel'
import background1 from '@/assets/background-1.jpg'
import background2 from '@/assets/background-2.jpg'
import background3 from '@/assets/background-3.jpg'
import background4 from '@/assets/background-4.jpg'
import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

const marginLimits = {
    marginTop: { min: 0, max: 30 },
    marginBottom: { min: 0, max: 30 },
    marginX: { min: 0, max: 20 },
}

const appCardRadiusLimits = { min: 0, max: 32 }
const appCardAspectRatios = new Set(['auto', '16 / 9', '2 / 1', '5 / 2', '3 / 1'])
const defaultAppCardColor = '#2196F3'

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
        iconTextInfoHideDescription: false,
        logoText: 'Homelab Panel',
        logoImageSrc: '',
        clockShow: true,
        clockShowSecond: false,
        searchBoxShow: false,
        marginBottom: 2,
        marginTop: 3,
        marginX: 5,
        footerShow: true,
        appCardRadius: 16,
        appCardAspectRatio: 'auto',
        appCardDefaultColor: defaultAppCardColor,
    }
}

function clampPercent(
    value: number | undefined,
    fallback: number | undefined,
    limits: { min: number; max: number },
) {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback

    return Math.min(limits.max, Math.max(limits.min, value))
}

function clampNumber(
    value: number | undefined,
    fallback: number | undefined,
    limits: { min: number; max: number },
) {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback

    return Math.min(limits.max, Math.max(limits.min, value))
}

function sanitizeAspectRatio(value: string | undefined, fallback: string | undefined) {
    if (!value || !appCardAspectRatios.has(value)) return fallback

    return value
}

function sanitizeHexColor(value: string | undefined, fallback: string | undefined) {
    if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) return fallback

    return value.toUpperCase()
}

export function sanitizePanelConfig(config: Partial<PanelConfig>): PanelConfig {
    const defaults = defaultPanelConfig()

    return {
        backgroundImageSrc: config.backgroundImageSrc ?? defaults.backgroundImageSrc,
        backgroundBlur: config.backgroundBlur ?? defaults.backgroundBlur,
        backgroundMaskNumber: config.backgroundMaskNumber ?? defaults.backgroundMaskNumber,
        iconTextInfoHideDescription:
            config.iconTextInfoHideDescription ?? defaults.iconTextInfoHideDescription,
        logoText: config.logoText ?? defaults.logoText,
        logoImageSrc: config.logoImageSrc ?? defaults.logoImageSrc,
        clockShow: config.clockShow ?? defaults.clockShow,
        clockShowSecond: config.clockShowSecond ?? defaults.clockShowSecond,
        clockColor: config.clockColor ?? defaults.clockColor,
        searchBoxShow: config.searchBoxShow ?? defaults.searchBoxShow,
        marginTop: clampPercent(config.marginTop, defaults.marginTop, marginLimits.marginTop),
        marginBottom: clampPercent(
            config.marginBottom,
            defaults.marginBottom,
            marginLimits.marginBottom,
        ),
        marginX: clampPercent(config.marginX, defaults.marginX, marginLimits.marginX),
        footerShow: config.footerShow ?? defaults.footerShow,
        appCardRadius: clampNumber(
            config.appCardRadius,
            defaults.appCardRadius,
            appCardRadiusLimits,
        ),
        appCardAspectRatio: sanitizeAspectRatio(
            config.appCardAspectRatio,
            defaults.appCardAspectRatio,
        ),
        appCardDefaultColor: sanitizeHexColor(
            config.appCardDefaultColor,
            defaults.appCardDefaultColor,
        ),
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
            panelConfig: sanitizePanelConfig({}),
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
                        panelConfig: sanitizePanelConfig(res.data.config),
                        searchEngine: res.data.searchEngine,
                        groups: res.data.groups,
                        items: res.data.items,
                        panelDataVersion: get().panelDataVersion + 1,
                    })
                }
            },

            setPanelConfig: (panelConfig) => {
                const nextPanelConfig = sanitizePanelConfig(panelConfig)
                set({ panelConfig: nextPanelConfig })
                return persistPanel(get, set, { panelConfig: nextPanelConfig })
            },
            resetPanelConfig: () => set({ panelConfig: sanitizePanelConfig({}) }),

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
