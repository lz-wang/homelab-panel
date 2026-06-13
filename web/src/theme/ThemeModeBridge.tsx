import { useColorScheme } from '@mui/material/styles'
import { useEffect } from 'react'

import { usePanelStore } from '@/store/panel'

export function ThemeModeBridge() {
  const themeMode = usePanelStore(s => s.panelConfig.themeMode)
  const { setMode } = useColorScheme()

  useEffect(() => {
    setMode(themeMode ?? 'system')
  }, [setMode, themeMode])

  return null
}
