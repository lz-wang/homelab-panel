import Avatar from '@mui/material/Avatar'

import type { ItemIcon as ItemIconType } from '@/types/panel'

import { IconifyIcon } from './IconifyIcon'

interface Props {
    itemIcon?: ItemIconType | null
    size?: number
    forceBackground?: string
}

export function ItemIcon({ itemIcon, size = 70, forceBackground }: Props) {
    const backgroundColor = forceBackground ?? itemIcon?.backgroundColor ?? '#2196F3'

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

    return (
        <Avatar
            sx={{
                width: size,
                height: size,
                bgcolor: backgroundColor,
                color: itemIcon.color ?? '#FFFFFF',
            }}
        >
            <IconifyIcon icon={itemIcon.text} size={Math.round(size * 0.5)} />
        </Avatar>
    )
}
