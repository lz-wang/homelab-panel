import { Icon } from '@iconify/react'

// Iconify 图标由前端直接经 @iconify/react 渲染（按需从 Iconify API 加载），
// 颜色跟随父级 currentColor；后端只负责存储/返回 identifier。

interface Props {
    icon?: string
    size?: number
}

export function IconifyIcon({ icon, size = 35 }: Props) {
    if (!icon) {
        return null
    }

    return <Icon icon={icon} width={size} height={size} />
}
