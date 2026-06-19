import type { ItemIconGroup, ItemInfo } from '@/types/panel'

export interface ItemGroup extends ItemIconGroup {
    sortStatus?: boolean
    hoverStatus: boolean
    items?: ItemInfo[]
}

export interface DragState {
    groupIndex: number
    itemIndex: number
}
