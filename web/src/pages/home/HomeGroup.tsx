import AddIcon from '@mui/icons-material/Add'
import CancelIcon from '@mui/icons-material/Cancel'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import { AppIcon } from '@/components/common/AppIcon'
import { useTranslation } from '@/locales'
import type { ItemInfo, PanelConfig } from '@/types/panel'

import type { ItemGroup } from './types'

const groupTitleColor = '#fff'

const groupActionIconSx = {
    color: groupTitleColor,
    p: 0.5,
    bgcolor: 'transparent',
    '&:hover': {
        bgcolor: 'transparent',
        opacity: 0.8,
    },
}

interface Props {
    group: ItemGroup
    sourceGroupIndex: number
    canManage: boolean
    isSearchActive: boolean
    panelConfig: PanelConfig
    onAddItem: (itemIconGroupId?: number) => void
    onToggleSort: (groupIndex: number, sortStatus: boolean) => void
    onSaveSort: (group: ItemGroup) => void
    onCancelSort: (group: ItemGroup) => void
    onDragStart: (groupIndex: number, itemIndex: number) => void
    onDrop: (groupIndex: number, itemIndex: number) => void
    onItemClick: (groupIndex: number, item: ItemInfo) => void
    onItemEdit: (item: ItemInfo) => void
    onContextMenu: (event: React.MouseEvent, item: ItemInfo, sorting?: boolean) => void
}

export function HomeGroup({
    group,
    sourceGroupIndex,
    canManage,
    isSearchActive,
    panelConfig,
    onAddItem,
    onToggleSort,
    onSaveSort,
    onCancelSort,
    onDragStart,
    onDrop,
    onItemClick,
    onItemEdit,
    onContextMenu,
}: Props) {
    const sorting = Boolean(group.sortStatus) && !isSearchActive
    const { t } = useTranslation()

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
                <Typography
                    variant="h6"
                    sx={{
                        color: groupTitleColor,
                        fontWeight: 800,
                        textShadow: '2px 2px 50px #000',
                    }}
                >
                    {group.title}
                </Typography>
                {canManage && (
                    <Stack direction="row" spacing={0.5}>
                        <Tooltip title={t('common.add')}>
                            <IconButton
                                size="small"
                                sx={groupActionIconSx}
                                onClick={() => onAddItem(group.id)}
                            >
                                <AddIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {!isSearchActive && (
                            <Tooltip title={t('common.sort')}>
                                <IconButton
                                    size="small"
                                    sx={groupActionIconSx}
                                    onClick={() =>
                                        onToggleSort(sourceGroupIndex, !group.sortStatus)
                                    }
                                >
                                    <DragIndicatorIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                )}
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 2.25,
                }}
            >
                {group.items?.map((item, itemIndex) => (
                    <Box
                        key={item.id ?? itemIndex}
                        draggable={sorting}
                        onDragStart={() => onDragStart(sourceGroupIndex, itemIndex)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => onDrop(sourceGroupIndex, itemIndex)}
                        onClick={() => {
                            if (sorting) return

                            // 编辑模式：单击直接进入编辑；浏览模式：单击导航。
                            if (canManage) {
                                onItemEdit(item)
                            } else {
                                onItemClick(sourceGroupIndex, item)
                            }
                        }}
                        onContextMenu={(event) => onContextMenu(event, item, sorting)}
                    >
                        <AppIcon
                            item={item}
                            showDescription={panelConfig.iconTextInfoShowDescription ?? false}
                            borderRadius={panelConfig.appCardRadius ?? 16}
                            aspectRatio={
                                panelConfig.appCardAspectRatio === 'auto'
                                    ? undefined
                                    : panelConfig.appCardAspectRatio
                            }
                            defaultBackgroundColor={panelConfig.appCardDefaultColor ?? '#2196F3'}
                        />
                    </Box>
                ))}
            </Box>

            {sorting && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button startIcon={<SaveIcon />} onClick={() => onSaveSort(group)}>
                        {t('common.saveSort')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => onCancelSort(group)}
                    >
                        {t('common.cancel')}
                    </Button>
                </Stack>
            )}
        </Box>
    )
}
