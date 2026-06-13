import { createTheme } from '@mui/material/styles'

import { md3Dark, md3Light } from './md3Colors'
import { md3Components } from './md3Components'
import { md3Typography } from './md3Typography'

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: md3Light.primary,
          contrastText: md3Light.onPrimary,
        },
        secondary: {
          main: md3Light.secondary,
          contrastText: md3Light.onSecondary,
        },
        error: {
          main: md3Light.error,
          contrastText: md3Light.onError,
        },
        background: {
          default: md3Light.surface,
          paper: md3Light.surfaceContainer,
        },
        text: {
          primary: md3Light.onSurface,
          secondary: md3Light.onSurfaceVariant,
        },
        divider: md3Light.outlineVariant,
        m3: md3Light,
      },
    },
    dark: {
      palette: {
        primary: {
          main: md3Dark.primary,
          contrastText: md3Dark.onPrimary,
        },
        secondary: {
          main: md3Dark.secondary,
          contrastText: md3Dark.onSecondary,
        },
        error: {
          main: md3Dark.error,
          contrastText: md3Dark.onError,
        },
        background: {
          default: md3Dark.surface,
          paper: md3Dark.surfaceContainer,
        },
        text: {
          primary: md3Dark.onSurface,
          secondary: md3Dark.onSurfaceVariant,
        },
        divider: md3Dark.outlineVariant,
        m3: md3Dark,
      },
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: md3Typography,
  components: md3Components,
})
