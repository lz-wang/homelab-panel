import { describe, expect, it } from 'vitest'

import { md3Dark, md3Light } from './md3Colors'
import { theme } from './theme'

describe('theme', () => {
  it('creates light and dark MD3 color schemes', () => {
    expect(theme.colorSchemes.light).toBeDefined()
    expect(theme.colorSchemes.dark).toBeDefined()
    expect(theme.colorSchemes.light!.palette.m3.primary).toBe(md3Light.primary)
    expect(theme.colorSchemes.dark!.palette.m3.primary).toBe(md3Dark.primary)
    expect(theme.cssVarPrefix).toBe('mui')
  })
})
