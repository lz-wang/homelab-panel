import { describe, expect, it } from 'vitest'
import { toBackendItem, toBackendPanel, toFrontendItem, toFrontendPanel } from './adapters'

describe('toBackendPanel', () => {
  it('emits snake_case wire keys and converts PanelConfig', () => {
    const wire = toBackendPanel({
      siteName: 'Lab',
      config: { backgroundImageSrc: 'a.png', maxWidthUnit: 'px' },
      searchEngine: {},
      groups: [],
      items: [],
    })
    expect(wire.site_name).toBe('Lab')
    expect(wire.config).toEqual({ background_image_src: 'a.png', max_width_unit: 'px' })
  })
})

describe('toBackendItem', () => {
  it('maps fields to snake_case', () => {
    const wire = toBackendItem({ id: 1, icon: null, title: 't', url: 'u', openMethod: 2, itemIconGroupId: 3 })
    expect(wire.group_id).toBe(3)
    expect(wire.open_method).toBe('new_tab')
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
    const fe = toFrontendItem({ group_id: 5, title: 't', url: 'u', icon: null, open_method: 'iframe' })
    expect(fe.itemIconGroupId).toBe(5)
    expect(fe.openMethod).toBe(3)
  })
})
