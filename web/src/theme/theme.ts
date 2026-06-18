import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data',
  },
  colorSchemes: {
    light: true,
    dark: true,
  },
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained',
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
})
