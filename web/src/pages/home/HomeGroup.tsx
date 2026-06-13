import AddIcon from '@mui/icons-material/Add'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import CancelIcon from '@mui/icons-material/Cancel'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Fab from '@mui/material/Fab'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { AppIcon } from '@/components/common/AppIcon'
import { PanelPanelConfigStyleEnum } from '@/constants/panel'
import { t } from '@/locales'
import type { PanelConfig, ItemInfo } from '@/types/panel'

import type { ItemGroup } from './types'

interface Props {
  group: ItemGroup
  groupIndex: number
  sourceGroupIndex: number
  canManage: boolean
  isSearchActive: boolean
  panelConfig: PanelConfig
  onAddItem: (itemIconGroupId?: number) => void
  onBatchAdd: (itemIconGroupId?: number) => void
  onToggleSort: (groupIndex: number, sortStatus: boolean) => void
  onSaveSort: (group: ItemGroup) => void
  onCancelSort: (group: ItemGroup) => void
  onDragStart: (groupIndex: number, itemIndex: number) => void
  onDrop: (groupIndex: number, itemIndex: number) => void
  onItemClick: (groupIndex: number, item: ItemInfo) => void
  onContextMenu: (event: React.MouseEvent, item: ItemInfo, sorting?: boolean) => void
}

export function HomeGroup({
  group,
  groupIndex,
  sourceGroupIndex,
  canManage,
  isSearchActive,
  panelConfig,
  onAddItem,
  onBatchAdd,
  onToggleSort,
  onSaveSort,
  onCancelSort,
  onDragStart,
  onDrop,
  onItemClick,
  onContextMenu,
}: Props) {
  const sorting = Boolean(group.sortStatus) && !isSearchActive

  return (
    <Box
      sx={{
        mt: 6,
        p: sorting ? 1.25 : 0,
        borderRadius: 2,
        boxShadow: sorting ? '0 0 30px 10px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Typography color="white" variant="h6" sx={{ fontWeight: 800, textShadow: '2px 2px 50px #000' }}>
          {group.title}
        </Typography>
        {canManage && (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('common.add')}>
              <Fab size="small" color="default" onClick={() => onAddItem(group.id)}>
                <AddIcon fontSize="small" />
              </Fab>
            </Tooltip>
            <Tooltip title="批量添加">
              <Fab size="small" color="default" onClick={() => onBatchAdd(group.id)}>
                <PlaylistAddIcon fontSize="small" />
              </Fab>
            </Tooltip>
            {!isSearchActive && (
              <Tooltip title={t('common.sort')}>
                <Fab size="small" color="default" onClick={() => onToggleSort(sourceGroupIndex, !group.sortStatus)}>
                  <DragIndicatorIcon fontSize="small" />
                </Fab>
              </Tooltip>
            )}
          </Stack>
        )}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns:
            panelConfig.iconStyle === PanelPanelConfigStyleEnum.info
              ? 'repeat(auto-fill, minmax(200px, 1fr))'
              : 'repeat(auto-fill, minmax(75px, 1fr))',
          gap: 2.25,
        }}
      >
        {group.items?.map((item, itemIndex) => (
          <Box
            key={item.id ?? itemIndex}
            draggable={sorting}
            onDragStart={() => onDragStart(sourceGroupIndex, itemIndex)}
            onDragOver={event => event.preventDefault()}
            onDrop={() => onDrop(sourceGroupIndex, itemIndex)}
            onClick={() => onItemClick(sourceGroupIndex, item)}
            onContextMenu={event => onContextMenu(event, item, sorting)}
          >
            <AppIcon
              item={item}
              style={panelConfig.iconStyle ?? PanelPanelConfigStyleEnum.icon}
              iconTextColor={panelConfig.iconTextColor ?? '#ffffff'}
              hideDescription={panelConfig.iconTextInfoHideDescription ?? false}
              hideTitle={panelConfig.iconTextIconHideTitle ?? false}
            />
          </Box>
        ))}
      </Box>

      {sorting && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button startIcon={<SaveIcon />} onClick={() => onSaveSort(group)}>
            {t('common.saveSort')}
          </Button>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => onCancelSort(group)}>
            {t('common.cancel')}
          </Button>
        </Stack>
      )}
    </Box>
  )
}
