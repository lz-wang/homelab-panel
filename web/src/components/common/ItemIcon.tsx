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
    const backgroundColor = forceBackground ?? itemIcon?.backgroundColor ?? '#2196F3'
    const color = itemIcon?.color ?? '#FFFFFF'

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

    const hasSrc = Boolean(itemIcon.src)
    const hasText = Boolean(itemIcon.text)

    // 图片：itemType=2 且确有图片源。
    if (itemIcon.itemType === 2 && hasSrc) {
        return (
            <Box
                component="img"
                src={itemIcon.src}
                decoding="async"
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

    // iconify：itemType=3，或 itemType 为 0/2 但只给了文字。
    // 后者兼容历史脏数据——曾把 iconify 图标误存为 itemType=2（图片）却没有 src，
    // 此处按其 text 当 iconify 图标渲染，避免空白。
    if (
        itemIcon.itemType === 3 ||
        ((itemIcon.itemType === 0 || itemIcon.itemType === 2) && hasText)
    ) {
        return (
            <Avatar sx={{ width: size, height: size, bgcolor: backgroundColor, color }}>
                <IconifyIcon icon={itemIcon.text} size={Math.round(size * 0.5)} />
            </Avatar>
        )
    }

    // 纯文本：itemType=1。
    if (itemIcon.itemType === 1) {
        return (
            <Avatar sx={{ width: size, height: size, bgcolor: backgroundColor, color }}>
                {itemIcon.text}
            </Avatar>
        )
    }

    return null
}
