import { describe, expect, it } from 'vitest'

import { cleanGroup, cleanItem, isExportV1 } from '@/utils/exportFormat'

describe('export format utilities', () => {
    it('removes persisted group identity fields', () => {
        expect(cleanGroup({ id: 1, title: 'Ops', icon: 'mdi:server', sort: 3 })).toEqual({
            title: 'Ops',
            icon: 'mdi:server',
            sort: 3,
        })
    })

    it('rewrites item group identity for import', () => {
        expect(
            cleanItem(
                {
                    id: 10,
                    title: 'NAS',
                    url: 'https://nas.local',
                    description: 'storage',
                    openMethod: 2,
                    sort: 5,
                    itemIconGroupId: 1,
                    icon: { itemType: 3, text: 'mdi:nas' },
                },
                9,
            ),
        ).toEqual({
            title: 'NAS',
            url: 'https://nas.local',
            description: 'storage',
            openMethod: 2,
            sort: 5,
            itemIconGroupId: 9,
            icon: { itemType: 3, text: 'mdi:nas' },
        })
    })

    it('recognizes v1 export payloads', () => {
        expect(
            isExportV1({
                version: 1,
                exportedAt: '2026-06-13T00:00:00.000Z',
                panel: { marginTop: 3 },
                groups: [{ group: { title: 'Ops' }, items: [] }],
            }),
        ).toBe(true)

        expect(isExportV1({ version: 2, panel: {}, groups: [] })).toBe(false)
        expect(isExportV1({ version: 1, panel: {}, groups: [{ group: {}, items: null }] })).toBe(
            false,
        )
    })
})
