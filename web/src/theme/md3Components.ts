import type { Components, Theme } from '@mui/material/styles'

import { md3Shape } from './md3Shape'

export const md3Components: Components<Omit<Theme, 'components'>> = {
  MuiButton: {
    defaultProps: {
      variant: 'contained',
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: md3Shape.full,
        minHeight: 40,
        paddingInline: 24,
        textTransform: 'none',
        fontWeight: 600,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: ({ theme }) => ({
        backgroundColor: theme.vars.palette.primary.main,
        color: theme.vars.palette.primary.contrastText,
      }),
      outlined: ({ theme }) => ({
        borderColor: theme.vars.palette.m3.outline,
        color: theme.vars.palette.primary.main,
      }),
      text: ({ theme }) => ({
        color: theme.vars.palette.primary.main,
      }),
    },
  },
  MuiFab: {
    defaultProps: {
      color: 'primary',
    },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: md3Shape.large,
        boxShadow: 'none',
        backgroundColor: theme.vars.palette.m3.primaryContainer,
        color: theme.vars.palette.m3.onPrimaryContainer,
        '&:hover': {
          boxShadow: 'none',
          backgroundColor: theme.vars.palette.m3.primaryContainer,
          filter: 'brightness(0.96)',
        },
      }),
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: 24,
        backgroundColor: theme.vars.palette.m3.surfaceContainer,
        color: theme.vars.palette.m3.onSurface,
        boxShadow: 'none',
      }),
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: 'none',
        backgroundColor: theme.vars.palette.m3.surfaceContainer,
      }),
      rounded: {
        borderRadius: 24,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: md3Shape.extraLarge,
        backgroundColor: theme.vars.palette.m3.surfaceContainerHigh,
        color: theme.vars.palette.m3.onSurface,
        backgroundImage: 'none',
      }),
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: md3Shape.large,
        backgroundColor: theme.vars.palette.m3.surfaceContainerHighest,
        '& fieldset': {
          borderColor: theme.vars.palette.m3.outlineVariant,
        },
        '&:hover fieldset': {
          borderColor: theme.vars.palette.m3.outline,
        },
        '&.Mui-focused fieldset': {
          borderColor: theme.vars.palette.primary.main,
          borderWidth: 2,
        },
      }),
    },
  },
  MuiSnackbar: {
    styleOverrides: {
      root: {
        borderRadius: md3Shape.medium,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme, ownerState }) => ({
        borderRadius: md3Shape.medium,
        ...(ownerState.variant === 'filled' && ownerState.severity === 'success'
          ? {
              backgroundColor: theme.vars.palette.m3.primaryContainer,
              color: theme.vars.palette.m3.onPrimaryContainer,
            }
          : {}),
        ...(ownerState.variant === 'filled' && ownerState.severity === 'error'
          ? {
              backgroundColor: theme.vars.palette.m3.errorContainer,
              color: theme.vars.palette.m3.onErrorContainer,
            }
          : {}),
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: md3Shape.full,
        marginInline: 8,
        '&.Mui-selected': {
          backgroundColor: theme.vars.palette.m3.secondaryContainer,
          color: theme.vars.palette.m3.onSecondaryContainer,
          '& .MuiListItemIcon-root': {
            color: theme.vars.palette.m3.onSecondaryContainer,
          },
        },
      }),
    },
  },
}
