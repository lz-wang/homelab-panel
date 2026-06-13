import DeleteIcon from '@mui/icons-material/Delete'
import LanIcon from '@mui/icons-material/Lan'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PublicIcon from '@mui/icons-material/Public'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { PanelStateNetworkModeEnum } from '@/constants/panel'
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
  networkMode: PanelStateNetworkModeEnum | null
  onClose: () => void
  getItemUrl: (item: ItemInfo) => string
  openPage: (openMethod: number, url: string, title?: string) => void
  onEdit: (item: ItemInfo) => void
  onDelete: (item: ItemInfo) => void
}

export function HomeContextMenu({
  contextMenu,
  canManage,
  networkMode,
  onClose,
  getItemUrl,
  openPage,
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
      <MenuItem
        onClick={() => {
          if (contextMenu?.item)
            window.open(getItemUrl(contextMenu.item))
          onClose()
        }}
      >
        <OpenInNewIcon fontSize="small" style={{ marginRight: 8 }} />
        {t('iconItem.newWindowOpen')}
      </MenuItem>
      {contextMenu?.item?.lanUrl && networkMode === PanelStateNetworkModeEnum.wan && (
        <MenuItem
          onClick={() => {
            if (contextMenu.item)
              openPage(contextMenu.item.openMethod, contextMenu.item.lanUrl as string, contextMenu.item.title)
            onClose()
          }}
        >
          <LanIcon fontSize="small" style={{ marginRight: 8 }} />
          {t('panelHome.openLanUrl')}
        </MenuItem>
      )}
      {contextMenu?.item?.lanUrl && networkMode === PanelStateNetworkModeEnum.lan && (
        <MenuItem
          onClick={() => {
            if (contextMenu.item)
              openPage(contextMenu.item.openMethod, contextMenu.item.url, contextMenu.item.title)
            onClose()
          }}
        >
          <PublicIcon fontSize="small" style={{ marginRight: 8 }} />
          {t('panelHome.openWanUrl')}
        </MenuItem>
      )}
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
