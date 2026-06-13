import { useEffect, useState } from 'react'

import { getByName } from '@/api/system/moduleConfig'
import {
  defaultSystemMonitorConfig,
  systemMonitorConfigName,
  type SystemMonitorConfig,
} from '@/types/systemMonitor'

export function useSystemMonitorConfig() {
  const [config, setConfig] = useState<SystemMonitorConfig>(defaultSystemMonitorConfig())
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadConfig() {
      const res = await getByName<Partial<SystemMonitorConfig>>(systemMonitorConfigName)

      if (!mounted)
        return

      if (res.code === 0) {
        setConfig({ ...defaultSystemMonitorConfig(), ...(res.data ?? {}) })
        setError('')
        return
      }

      setConfig(defaultSystemMonitorConfig())
      setError(res.msg)
    }

    loadConfig()

    return () => {
      mounted = false
    }
  }, [])

  return {
    config,
    error,
  }
}
