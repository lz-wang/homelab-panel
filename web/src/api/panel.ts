import { type PanelWire, toBackendPanel, toFrontendPanel } from '@/api/adapters'
import { get, put } from '@/api/request'
import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

export interface PanelDocument {
    siteName: string
    config: PanelConfig
    searchEngine: unknown
    groups: ItemIconGroup[]
    items: ItemInfo[]
}

export function getPanel() {
    return get<PanelWire>({ url: '/panel' }).then((res) => ({
        ...res,
        data: res.code === 0 ? toFrontendPanel(res.data) : (null as unknown as PanelDocument),
    }))
}

export function savePanel(doc: PanelDocument) {
    return put<PanelWire>({ url: '/panel', data: toBackendPanel(doc) }).then((res) => ({
        ...res,
        data: res.code === 0 ? toFrontendPanel(res.data) : (null as unknown as PanelDocument),
    }))
}
