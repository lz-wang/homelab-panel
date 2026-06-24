import { useCallback, useRef, useState } from 'react'

import { getPanel } from '@/api/panel'
import { usePanelStore } from '@/store/panel'

import type { ItemGroup } from './types'

export function useHomeData() {
    const [items, setItems] = useState<ItemGroup[]>([])
    const [loading, setLoading] = useState(true)
    const loadRequestId = useRef(0)

    const loadList = useCallback(async () => {
        const requestId = loadRequestId.current + 1
        loadRequestId.current = requestId
        setLoading(true)

        try {
            const res = await getPanel()

            if (res.code !== 0 || !res.data) return

            // 同步写入 panel store（供 GroupManager/StylePanel 等读取）
            usePanelStore.setState({
                siteName: res.data.siteName,
                panelConfig: { ...usePanelStore.getState().panelConfig, ...res.data.config },
                searchEngine: res.data.searchEngine,
                groups: res.data.groups,
                items: res.data.items,
            })

            const groups: ItemGroup[] = res.data.groups.map((group) => ({
                ...group,
                hoverStatus: false,
                items: res.data.items.filter((item) => item.itemIconGroupId === group.id),
            }))

            setItems(groups)
        } finally {
            if (loadRequestId.current === requestId) setLoading(false)
        }
    }, [])

    return {
        items,
        setItems,
        loading,
        loadList,
    }
}
