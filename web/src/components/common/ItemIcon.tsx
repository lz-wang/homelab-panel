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
  const backgroundColor = forceBackground ?? itemIcon?.backgroundColor ?? '#FFFFFF'

  if (!itemIcon) {
    return (
      <Avatar
        sx={{
          width: size,
          height: size,
          bgcolor: backgroundColor,
        }}
      />
    )
  }

  if (itemIcon.itemType === 1) {
    return (
      <Avatar sx={{ width: size, height: size, bgcolor: backgroundColor }}>
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
          bgcolor: backgroundColor,
          borderRadius: 2,
        }}
      />
    )
  }

  if (itemIcon.itemType === 3) {
    return (
      <Avatar sx={{ width: size, height: size, bgcolor: backgroundColor }}>
        <IconifyIcon icon={itemIcon.text} size={Math.round(size * 0.5)} />
      </Avatar>
    )
  }

  return null
}
