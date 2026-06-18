import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PanelDocument } from '@/api/panel'
import type { ItemIconGroup, ItemInfo } from '@/types/panel'

const apiMock = vi.hoisted(() => {
  const state: {
    panel: PanelDocument
    nextGroupId: number
    nextItemId: number
  } = {
    panel: {
      siteName: 'Homelab Panel',
      config: { maxWidthUnit: 'px' },
      searchEngine: {},
      groups: [],
      items: [],
    },
    nextGroupId: 1,
    nextItemId: 1,
  }

  return {
    state,
    getPanel: vi.fn(async () => ({
      code: 0,
      msg: 'OK',
      data: state.panel,
    })),
    savePanel: vi.fn(async (doc: PanelDocument) => {
      const groups = doc.groups.map((group: ItemIconGroup) => ({
        ...group,
        id: group.id ?? state.nextGroupId++,
      }))
      const groupIds = new Set(groups.map(group => group.id))

      const items = doc.items.map((item: ItemInfo) => ({
        ...item,
        id: item.id ?? state.nextItemId++,
      }))

      if (items.some(item => !item.itemIconGroupId || !groupIds.has(item.itemIconGroupId))) {
        return {
          code: 409,
          msg: 'item references unknown group',
          data: null,
        }
      }

      state.panel = {
        ...doc,
        groups,
        items,
      }

      return {
        code: 0,
        msg: 'OK',
        data: state.panel,
      }
    }),
  }
})

vi.mock('@/api/panel', () => ({
  getPanel: apiMock.getPanel,
  savePanel: apiMock.savePanel,
}))

describe('panel store', () => {
  beforeEach(async () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value)
      }),
      removeItem: vi.fn((key: string) => {
        values.delete(key)
      }),
      clear: vi.fn(() => {
        values.clear()
      }),
      key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
      get length() {
        return values.size
      },
    }

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    })
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    })

    apiMock.state.panel = {
      siteName: 'Homelab Panel',
      config: { maxWidthUnit: 'px' },
      searchEngine: {},
      groups: [],
      items: [],
    }
    apiMock.state.nextGroupId = 1
    apiMock.state.nextItemId = 1
    apiMock.getPanel.mockClear()
    apiMock.savePanel.mockClear()

    const { usePanelStore, defaultPanelConfig } = await import('@/store/panel')
    usePanelStore.setState({
      siteName: 'Homelab Panel',
      panelConfig: defaultPanelConfig(),
      searchEngine: {},
      groups: [],
      items: [],
      panelDataVersion: 0,
    })
  })

  it('can create the first group and add the first app from an empty panel', async () => {
    const { usePanelStore } = await import('@/store/panel')
    const store = usePanelStore.getState()

    const groupRes = await store.upsertGroup({
      title: '默认分组',
      sort: 1,
    })
    const groupId = usePanelStore.getState().groups[0]?.id

    expect(groupRes.code).toBe(0)
    expect(groupId).toBe(1)

    const itemRes = await usePanelStore.getState().upsertItem({
      itemIconGroupId: groupId,
      title: 'Example',
      url: 'https://example.com/',
      description: '',
      openMethod: 2,
      icon: {
        itemType: 3,
        text: 'mdi:application-outline',
        backgroundColor: '#2a2a2a',
      },
    })

    expect(itemRes.code).toBe(0)
    expect(usePanelStore.getState().items).toMatchObject([
      {
        id: 1,
        itemIconGroupId: 1,
        title: 'Example',
      },
    ])
  })
})
