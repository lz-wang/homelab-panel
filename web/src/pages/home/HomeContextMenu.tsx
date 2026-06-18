import DeleteIcon from '@mui/icons-material/Delete'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { t } from '@/locales'
import type { ItemInfo } from '@/types/panel'

export interface HomeContextMenuState {
  mouseX: number
  mouseY: number
  item: ItemInfo | null
}

interface Props {
  contextMenu: HomeContextMenuState | null
  canManage: boolean
  onClose: () => void
  onEdit: (item: ItemInfo) => void
  onDelete: (item: ItemInfo) => void
}

export function HomeContextMenu({
  contextMenu,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Menu
      open={Boolean(contextMenu)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
    >
      {canManage && (
        <MenuItem
          onClick={() => {
            if (contextMenu?.item)
              onEdit(contextMenu.item)
            onClose()
          }}
        >
          {t('common.edit')}
        </MenuItem>
      )}
      {canManage && (
        <MenuItem
          onClick={() => {
            if (contextMenu?.item)
              onDelete(contextMenu.item)
            onClose()
          }}
        >
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
          {t('common.delete')}
        </MenuItem>
      )}
    </Menu>
  )
}
