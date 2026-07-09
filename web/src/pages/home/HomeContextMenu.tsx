import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

import { useTranslation } from '@/locales'
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
    onCopy: (item: ItemInfo) => void
    onDelete: (item: ItemInfo) => void
}

export function HomeContextMenu({
    contextMenu,
    canManage,
    onClose,
    onEdit,
    onCopy,
    onDelete,
}: Props) {
    const { t } = useTranslation()
    return (
        <Menu
            open={Boolean(contextMenu)}
            disableAutoFocusItem
            onClose={onClose}
            anchorReference="anchorPosition"
            anchorPosition={
                contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
            }
            slotProps={{ paper: { sx: { borderRadius: 2 } } }}
        >
            {canManage && (
                <MenuItem
                    onClick={() => {
                        if (contextMenu?.item) onEdit(contextMenu.item)
                        onClose()
                    }}
                    sx={{ pr: 4 }}
                >
                    <ListItemIcon>
                        <EditOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    {t('common.edit')}
                </MenuItem>
            )}
            {canManage && (
                <MenuItem
                    onClick={() => {
                        if (contextMenu?.item) onCopy(contextMenu.item)
                        onClose()
                    }}
                    sx={{ pr: 4 }}
                >
                    <ListItemIcon>
                        <ContentCopyOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    {t('common.copy')}
                </MenuItem>
            )}
            {canManage && (
                <MenuItem
                    onClick={() => {
                        if (contextMenu?.item) onDelete(contextMenu.item)
                        onClose()
                    }}
                    sx={{ pr: 4 }}
                >
                    <ListItemIcon>
                        <DeleteOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    {t('common.delete')}
                </MenuItem>
            )}
        </Menu>
    )
}
