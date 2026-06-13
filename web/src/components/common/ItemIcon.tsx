import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'

import type { ItemIcon as ItemIconType } from '@/types/panel'

import { IconifyIcon } from './IconifyIcon'

interface Props {
  itemIcon?: ItemIconType | null
  size?: number
  forceBackground?: string
}

export function ItemIcon({ itemIcon, size = 70, forceBackground }: Props) {
  const backgroundColor = forceBackground ?? itemIcon?.backgroundColor

  if (!itemIcon) {
    return (
      <Avatar
        sx={theme => ({
          width: size,
          height: size,
          bgcolor: backgroundColor ?? theme.vars.palette.m3.surfaceContainerHigh,
        })}
      />
    )
  }

  if (itemIcon.itemType === 1) {
    return (
      <Avatar
        sx={theme => ({
          width: size,
          height: size,
          bgcolor: backgroundColor ?? theme.vars.palette.m3.surfaceContainerHigh,
        })}
      >
        {itemIcon.text}
      </Avatar>
    )
  }

  if (itemIcon.itemType === 2) {
    return (
      <Box
        component="img"
        src={itemIcon.src}
        sx={{
          width: size,
          height: size,
          objectFit: 'cover',
          bgcolor: backgroundColor ?? 'transparent',
          borderRadius: 6,
        }}
      />
    )
  }

  if (itemIcon.itemType === 3) {
    return (
      <Avatar
        sx={theme => ({
          width: size,
          height: size,
          bgcolor: backgroundColor ?? theme.vars.palette.m3.surfaceContainerHigh,
        })}
      >
        <IconifyIcon icon={itemIcon.text} size={Math.round(size * 0.5)} />
      </Avatar>
    )
  }

  return null
}
