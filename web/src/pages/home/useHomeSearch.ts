import { useMemo, useState } from 'react'

import type { PanelConfig } from '@/types/panel'

import type { ItemGroup } from './types'

export function useHomeSearch(items: ItemGroup[], panelConfig: PanelConfig) {
  const [keyword, setKeyword] = useState('')

  const filteredItems = useMemo(() => {
    const value = keyword.trim().toLowerCase()

    if (!value || !panelConfig.searchBoxSearchIcon)
      return items

    return items
      .map(group => ({
        ...group,
        items: group.items?.filter(item =>
          item.title.toLowerCase().includes(value)
          || item.url.toLowerCase().includes(value)
          || item.description?.toLowerCase().includes(value),
        ),
      }))
      .filter(group => group.items && group.items.length > 0)
  }, [items, keyword, panelConfig.searchBoxSearchIcon])

  return {
    keyword,
    setKeyword,
    filteredItems,
    isSearchActive: Boolean(keyword.trim()),
  }
}
