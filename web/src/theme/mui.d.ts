import type {} from '@mui/material/themeCssVarsAugmentation'

import type { Md3ColorRoles } from './md3Colors'

declare module '@mui/material/styles' {
  interface Palette {
    m3: Md3ColorRoles
  }

  interface PaletteOptions {
    m3?: Md3ColorRoles
  }
}
