import { describe, expect, it } from 'vitest'

import { md3Dark, md3Light, type Md3ColorRoles } from './md3Colors'

const requiredRoles: Array<keyof Md3ColorRoles> = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'surface',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'onSurfaceVariant',
  'outline',
  'outlineVariant',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
]

describe('md3 color tokens', () => {
  it('defines all required light and dark color roles', () => {
    for (const role of requiredRoles) {
      expect(md3Light[role]).toMatch(/^#[\dA-F]{6}$/i)
      expect(md3Dark[role]).toMatch(/^#[\dA-F]{6}$/i)
    }
  })
})
