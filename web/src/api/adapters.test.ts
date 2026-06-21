import { describe, expect, it } from 'vitest'
import type { ItemIcon } from '@/types/panel'
import { toBackendItem, toBackendPanel, toFrontendItem, toFrontendPanel } from './adapters'

describe('toBackendPanel', () => {
    it('emits snake_case wire keys and converts PanelConfig', () => {
        const wire = toBackendPanel({
            siteName: 'Lab',
            config: { backgroundImageSrc: 'a.png', marginTop: 3 },
            searchEngine: {},
            groups: [],
            items: [],
        })
        expect(wire.site_name).toBe('Lab')
        expect(wire.config).toEqual({ background_image_src: 'a.png', margin_top: 3 })
    })
})

describe('toBackendItem', () => {
    it('maps fields to snake_case', () => {
        const wire = toBackendItem({
            id: 1,
            icon: null,
            title: 't',
            url: 'u',
            itemIconGroupId: 3,
        })
        expect(wire.group_id).toBe(3)
    })
})

describe('toFrontendPanel', () => {
    it('converts snake_case wire back to camelCase', () => {
        const fe = toFrontendPanel({
            site_name: 'Lab',
            config: { background_image_src: 'a.png' },
            search_engine: {},
            groups: [],
            items: [],
        })
        expect(fe.siteName).toBe('Lab')
        expect(fe.config).toEqual({ backgroundImageSrc: 'a.png' })
    })
})

describe('toFrontendItem', () => {
    it('reads snake_case item fields', () => {
        const fe = toFrontendItem({
            group_id: 5,
            title: 't',
            url: 'u',
            icon: null,
        })
        expect(fe.itemIconGroupId).toBe(5)
    })
})

// 回归：编辑图标后保存，item_type / background_color 等多词字段必须在 wire 边界双向转换，
// 否则后端按 snake_case 反序列化会丢失（变 0 / ""），加载渲染时图标消失。
describe('icon wire casing', () => {
    const icon: ItemIcon = {
        itemType: 3,
        text: 'mdi:home',
        color: '#FFFFFF',
        backgroundColor: '#2196F3',
        src: '',
    }

    it('toBackendItem emits snake_case icon keys', () => {
        const wire = toBackendItem({
            id: 1,
            icon,
            title: 't',
            url: 'u',
            itemIconGroupId: 1,
        })
        expect(wire.icon).toEqual({
            item_type: 3,
            text: 'mdi:home',
            color: '#FFFFFF',
            background_color: '#2196F3',
            src: '',
        })
    })

    it('toFrontendItem reads snake_case icon keys back to camelCase', () => {
        // 模拟后端返回的原始 wire 数据（snake_case icon）
        const fe = toFrontendItem({
            group_id: 1,
            title: 't',
            url: 'u',
            icon: {
                item_type: 3,
                text: 'mdi:home',
                color: '#FFFFFF',
                background_color: '#2196F3',
                src: '',
            },
        })
        expect(fe.icon).toEqual({
            itemType: 3,
            text: 'mdi:home',
            color: '#FFFFFF',
            backgroundColor: '#2196F3',
            src: '',
        })
    })

    it('preserves icon fields across a save round-trip', () => {
        const wire = toBackendItem({
            id: 1,
            icon,
            title: 't',
            url: 'u',
            itemIconGroupId: 1,
        })
        const back = toFrontendItem({
            group_id: 1,
            title: 't',
            url: 'u',
            icon: wire.icon,
        })
        expect(back.icon?.itemType).toBe(3)
        expect(back.icon?.backgroundColor).toBe('#2196F3')
    })
})
