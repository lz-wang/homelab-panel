import { useMemo, useState } from 'react'

import type { ItemGroup } from './types'

export function useHomeSearch(items: ItemGroup[]) {
    const [keyword, setKeyword] = useState('')

    const filteredItems = useMemo(() => {
        const value = keyword.trim().toLowerCase()

        if (!value) return items

        return items
            .map((group) => ({
                ...group,
                items: group.items?.filter(
                    (item) =>
                        item.title.toLowerCase().includes(value) ||
                        item.url.toLowerCase().includes(value) ||
                        item.backupUrl?.toLowerCase().includes(value) ||
                        item.description?.toLowerCase().includes(value),
                ),
            }))
            .filter((group) => group.items && group.items.length > 0)
    }, [items, keyword])

    return {
        keyword,
        setKeyword,
        filteredItems,
        isSearchActive: Boolean(keyword.trim()),
    }
}
