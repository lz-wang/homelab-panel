import { useCallback, useEffect, useRef, useState } from 'react'

import { getSystemMonitorSnapshot } from '@/api/system/systemMonitor'
import type { SystemMonitorConfig, SystemMonitorSnapshot } from '@/types/systemMonitor'

export function useSystemMonitorSnapshot(config: SystemMonitorConfig) {
  const [snapshot, setSnapshot] = useState<SystemMonitorSnapshot | null>(null)
  const [error, setError] = useState('')
  const mountedRef = useRef(false)

  const refresh = useCallback(async () => {
    const res = await getSystemMonitorSnapshot()

    if (!mountedRef.current)
      return

    if (res.code === 0) {
      setSnapshot(res.data)
      setError('')
      return
    }

    setError(res.msg)
  }, [])

  useEffect(() => {
    mountedRef.current = true

    refresh()
    const timer = window.setInterval(refresh, Math.max(3, config.refreshIntervalSeconds) * 1000)

    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
    }
  }, [config.refreshIntervalSeconds, refresh])

  return {
    snapshot,
    error,
    refresh,
  }
}
