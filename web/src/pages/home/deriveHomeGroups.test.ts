import { describe, expect, it } from 'vitest'

import type { ItemIconGroup, ItemInfo } from '@/types/panel'

import { deriveHomeGroups } from './deriveHomeGroups'

function group(id: number, title: string): ItemIconGroup {
    return { id, title, sort: id }
}

function item(id: number, groupId: number | undefined, title: string): ItemInfo {
    return {
        id,
        itemIconGroupId: groupId,
        title,
        url: `https://${title}.example.com/`,
        description: '',
        icon: { text: 'mdi:server-network', color: '', backgroundColor: '' },
    }
}

describe('deriveHomeGroups', () => {
    it('groups items by itemIconGroupId', () => {
        const groups = [group(1, 'A'), group(2, 'B')]
        const itemX = item(11, 2, 'x')
        const itemY = item(12, 1, 'y')
        const itemZ = item(13, 1, 'z')

        expect(deriveHomeGroups(groups, [itemX, itemY, itemZ])).toEqual([
            { id: 1, title: 'A', sort: 1, hoverStatus: false, items: [itemY, itemZ] },
            { id: 2, title: 'B', sort: 2, hoverStatus: false, items: [itemX] },
        ])
    })

    it('keeps groups without items and drops orphan items', () => {
        const groups = [group(1, 'A')]

        expect(deriveHomeGroups(groups, [item(9, undefined, 'orphan')])).toEqual([
            { id: 1, title: 'A', sort: 1, hoverStatus: false, items: [] },
        ])
    })

    it('yields empty items for groups without id', () => {
        const groups = [{ title: 'no-id', sort: 1 }] as ItemIconGroup[]

        expect(deriveHomeGroups(groups, [item(1, 1, 'x')])).toEqual([
            { title: 'no-id', sort: 1, hoverStatus: false, items: [] },
        ])
    })
})
