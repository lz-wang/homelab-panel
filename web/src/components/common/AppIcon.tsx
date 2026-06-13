import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { PanelPanelConfigStyleEnum } from '@/constants/panel'
import type { ItemInfo } from '@/types/panel'

import { ItemIcon } from './ItemIcon'

interface Props {
  item: ItemInfo
  style: PanelPanelConfigStyleEnum
  iconTextColor: string
  hideDescription: boolean
  hideTitle: boolean
}

function readableTextColor(color: string) {
  const hex = color.replace(/^#/, '')

  if (hex.length !== 6)
    return 'white'

  const r = Number.parseInt(hex.substring(0, 2), 16)
  const g = Number.parseInt(hex.substring(2, 4), 16)
  const b = Number.parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? 'black' : 'white'
}

export function AppIcon({
  item,
  style,
  iconTextColor,
  hideDescription,
  hideTitle,
}: Props) {
  const background = item.icon?.backgroundColor
  const computedTextColor = iconTextColor === '#ffffff'
    ? readableTextColor(background ?? '#4F378B')
    : iconTextColor

  if (style === PanelPanelConfigStyleEnum.info) {
    return (
      <Box
        sx={theme => ({
          width: '100%',
          minHeight: 70,
          display: 'flex',
          borderRadius: 6,
          overflow: 'hidden',
          bgcolor: background ?? theme.vars.palette.m3.surfaceContainerHigh,
          border: `1px solid ${theme.vars.palette.m3.outlineVariant}`,
          cursor: 'pointer',
          transition: theme.transitions.create(['background-color', 'transform'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': {
            bgcolor: background ?? theme.vars.palette.m3.surfaceContainerHighest,
            transform: 'translateY(-1px)',
          },
        })}
      >
        <Box sx={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ItemIcon itemIcon={item.icon} forceBackground="transparent" size={50} />
        </Box>
        <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', color: computedTextColor, pr: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600 }}>
              {item.title}
            </Typography>
            {!hideDescription && (
              <Typography
                variant="caption"
                sx={{
                  display: '-webkit-box',
                  overflow: 'hidden',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {item.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}>
      <Box
        sx={theme => ({
          width: 70,
          height: 70,
          mx: 'auto',
          overflow: 'hidden',
          borderRadius: 6,
          transition: theme.transitions.create(['background-color', 'transform'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        })}
        title={item.description}
      >
        <ItemIcon itemIcon={item.icon} />
      </Box>
      {!hideTitle && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.25,
            color: iconTextColor,
            textShadow: '0 2px 16px rgba(0,0,0,0.42)',
            overflowWrap: 'anywhere',
          }}
        >
          {item.title}
        </Typography>
      )}
    </Box>
  )
}
