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

export function AppIcon({
  item,
  style,
  hideDescription,
  hideTitle,
}: Props) {
  const background = item.icon?.backgroundColor || '#2196F3'
  const itemColor = item.icon?.color || '#FFFFFF'

  if (style === PanelPanelConfigStyleEnum.info) {
    return (
      <Box
        sx={{
          width: '100%',
          minHeight: 70,
          display: 'flex',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: background,
          cursor: 'pointer',
          transition: 'box-shadow .2s',
          '&:hover': {
            boxShadow: '0 0 20px 10px rgba(0,0,0,0.2)',
          },
        }}
      >
        <Box sx={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ItemIcon itemIcon={item.icon} forceBackground="transparent" size={50} />
        </Box>
        <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', color: itemColor, pr: 1 }}>
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
        sx={{
          width: 70,
          height: 70,
          mx: 'auto',
          overflow: 'hidden',
          borderRadius: 2,
          transition: 'box-shadow .2s',
          '&:hover': {
            boxShadow: '0 0 20px 10px rgba(0,0,0,0.2)',
          },
        }}
        title={item.description}
      >
        <ItemIcon itemIcon={item.icon} />
      </Box>
      {!hideTitle && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.25,
            color: itemColor,
            textShadow: '2px 2px 5px #000',
            overflowWrap: 'anywhere',
          }}
        >
          {item.title}
        </Typography>
      )}
    </Box>
  )
}
