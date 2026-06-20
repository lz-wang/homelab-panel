import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import type { ItemInfo } from '@/types/panel'

import { ItemIcon } from './ItemIcon'

interface Props {
    item: ItemInfo
    hideDescription: boolean
    borderRadius?: number
    aspectRatio?: string
    defaultBackgroundColor?: string
}

export function AppIcon({
    item,
    hideDescription,
    borderRadius = 16,
    aspectRatio,
    defaultBackgroundColor = '#2196F3',
}: Props) {
    const background = item.icon?.backgroundColor || defaultBackgroundColor
    const itemColor = item.icon?.color || '#FFFFFF'

    const card = (
        <Box
            sx={{
                width: '100%',
                minHeight: aspectRatio ? undefined : 70,
                aspectRatio,
                display: 'flex',
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                bgcolor: background,
                cursor: 'pointer',
                transition: 'box-shadow .2s',
                '&:hover': {
                    boxShadow: '0 0 20px 10px rgba(0,0,0,0.2)',
                },
            }}
        >
            <Box
                sx={{
                    width: 70,
                    minHeight: 70,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <ItemIcon itemIcon={item.icon} forceBackground="transparent" size={50} />
            </Box>
            <Box
                sx={{
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    color: itemColor,
                    pr: 1,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        noWrap
                        variant={hideDescription ? 'subtitle1' : 'body1'}
                        sx={{ fontWeight: 700 }}
                    >
                        {item.title}
                    </Typography>
                    {!hideDescription && item.description && (
                        <Typography noWrap variant="caption" sx={{ opacity: 0.72 }}>
                            {item.description}
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    )

    // 隐藏描述时，悬浮卡片用 Tooltip 展示描述。
    // 给 Tooltip 根元素 block + 满宽，避免其默认 inline 包裹破坏卡片撑满父容器的布局。
    if (hideDescription && item.description) {
        return (
            <Tooltip
                title={item.description}
                placement="bottom"
                arrow
                sx={{ display: 'block', width: '100%' }}
            >
                {card}
            </Tooltip>
        )
    }

    return card
}
