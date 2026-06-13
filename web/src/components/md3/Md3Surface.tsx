import Box, { type BoxProps } from '@mui/material/Box'

type SurfaceLevel = 'low' | 'default' | 'high' | 'highest'

interface Md3SurfaceProps extends BoxProps {
  level?: SurfaceLevel
  glass?: boolean
}

const surfaceLevelToken: Record<SurfaceLevel, 'surfaceContainerLow' | 'surfaceContainer' | 'surfaceContainerHigh' | 'surfaceContainerHighest'> = {
  low: 'surfaceContainerLow',
  default: 'surfaceContainer',
  high: 'surfaceContainerHigh',
  highest: 'surfaceContainerHighest',
}

export function Md3Surface({
  level = 'default',
  glass = false,
  sx,
  ...props
}: Md3SurfaceProps) {
  return (
    <Box
      {...props}
      sx={[
        theme => ({
          borderRadius: 6,
          backgroundColor: glass
            ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.14)`
            : theme.vars.palette.m3[surfaceLevelToken[level]],
          color: theme.vars.palette.m3.onSurface,
          border: `1px solid ${theme.vars.palette.m3.outlineVariant}`,
          backdropFilter: glass ? 'blur(18px)' : undefined,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}
