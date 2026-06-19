import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import type { ItemInfo } from '@/types/panel'

import { ItemIcon } from './ItemIcon'

interface Props {
    item: ItemInfo
    hideDescription: boolean
}

export function AppIcon({ item, hideDescription }: Props) {
    const background = item.icon?.backgroundColor || '#2196F3'
    const itemColor = item.icon?.color || '#FFFFFF'

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
            <Box
                sx={{
                    width: 70,
                    height: 70,
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
                        <Typography
                            variant="caption"
                            sx={{
                                display: '-webkit-box',
                                overflow: 'hidden',
                                opacity: 0.72,
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
