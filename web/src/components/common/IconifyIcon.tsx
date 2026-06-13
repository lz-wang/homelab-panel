import { Icon } from '@iconify/react'

export function IconifyIcon({
  icon,
  size = 35,
}: {
  icon?: string
  size?: number
}) {
  if (!icon)
    return null

  return <Icon icon={icon} width={size} height={size} />
}
