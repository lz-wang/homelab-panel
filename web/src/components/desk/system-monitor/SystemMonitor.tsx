import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'

import { formatBytes, percent } from '@/utils/format'

import { SystemMonitorCard } from './SystemMonitorCard'
import { useSystemMonitorConfig } from './useSystemMonitorConfig'
import { useSystemMonitorSnapshot } from './useSystemMonitorSnapshot'

export function SystemMonitor({ showTitle, publicMode = false }: { showTitle?: boolean, publicMode?: boolean }) {
  const { config, error: configError } = useSystemMonitorConfig()
  const { snapshot, error: snapshotError } = useSystemMonitorSnapshot(config)

  const disk = useMemo(() => {
    if (!config.diskMountpoint)
      return snapshot?.diskInfo?.[0]

    return snapshot?.diskInfo?.find(item => item.mountpoint === config.diskMountpoint) ?? snapshot?.diskInfo?.[0]
  }, [config.diskMountpoint, snapshot])
  const cpuUsage = percent(snapshot?.cpuInfo?.usages?.[0])
  const memoryUsage = percent(snapshot?.memoryInfo?.usedPercent)
  const diskUsage = percent(disk?.usedPercent)

  if (!config.enabled || (publicMode && !config.publicVisible) || (!config.showCpu && !config.showMemory && !config.showDisk))
    return null

  if (!snapshot && !snapshotError)
    return null

  return (
    <Box sx={{ my: 3, width: '100%' }}>
      {(showTitle && config.showTitle) && (
        <Typography color="common.white" variant="h6" sx={{ mb: 1, fontWeight: 800, textShadow: '0 2px 24px rgba(0,0,0,0.42)' }}>
          System Monitor
        </Typography>
      )}
      {snapshot && (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
          {config.showCpu && (
            <SystemMonitorCard
              icon={<SpeedOutlinedIcon fontSize="small" />}
              title={snapshot.cpuInfo?.model || 'CPU'}
              value={cpuUsage}
              detail={`${snapshot.cpuInfo?.coreCount ?? 0} cores`}
            />
          )}
          {config.showMemory && (
            <SystemMonitorCard
              icon={<MemoryOutlinedIcon fontSize="small" />}
              title="Memory"
              value={memoryUsage}
              detail={`${formatBytes(snapshot.memoryInfo?.used)} / ${formatBytes(snapshot.memoryInfo?.total)}`}
            />
          )}
          {config.showDisk && disk && (
            <SystemMonitorCard
              icon={<StorageOutlinedIcon fontSize="small" />}
              title={disk.mountpoint || 'Disk'}
              value={diskUsage}
              detail={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
            />
          )}
        </Stack>
      )}
      {(configError || snapshotError) && (
        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'rgba(255 255 255 / 0.75)' }}>
          {configError || snapshotError}
        </Typography>
      )}
    </Box>
  )
}
