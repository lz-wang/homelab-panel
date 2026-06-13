import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'

import { getSystemMonitorSnapshot } from '@/api/system/systemMonitor'
import type { SystemMonitorSnapshot } from '@/types/systemMonitor'

function percent(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value))
    return 0

  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatBytes(value?: number) {
  if (!value)
    return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function MonitorCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode
  title: string
  value: number
  detail: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: 210,
        p: 1.5,
        bgcolor: 'rgba(20,20,20,0.55)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 1 }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
          {value}
          % ·
          {' '}
          {detail}
        </Typography>
      </Stack>
    </Paper>
  )
}

export function SystemMonitor({ showTitle }: { showTitle?: boolean }) {
  const [snapshot, setSnapshot] = useState<SystemMonitorSnapshot | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const res = await getSystemMonitorSnapshot()

      if (mounted && res.code === 0)
        setSnapshot(res.data)
    }

    load()
    const timer = window.setInterval(load, 10000)

    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  const disk = useMemo(() => snapshot?.diskInfo?.[0], [snapshot])
  const cpuUsage = percent(snapshot?.cpuInfo?.usages?.[0])
  const memoryUsage = percent(snapshot?.memoryInfo?.usedPercent)
  const diskUsage = percent(disk?.usedPercent)

  if (!snapshot)
    return null

  return (
    <Box sx={{ my: 3, width: '100%' }}>
      {showTitle && (
        <Typography color="white" variant="h6" sx={{ mb: 1, fontWeight: 800, textShadow: '2px 2px 50px #000' }}>
          System Monitor
        </Typography>
      )}
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        <MonitorCard
          icon={<SpeedOutlinedIcon fontSize="small" />}
          title={snapshot.cpuInfo?.model || 'CPU'}
          value={cpuUsage}
          detail={`${snapshot.cpuInfo?.coreCount ?? 0} cores`}
        />
        <MonitorCard
          icon={<MemoryOutlinedIcon fontSize="small" />}
          title="Memory"
          value={memoryUsage}
          detail={`${formatBytes(snapshot.memoryInfo?.used)} / ${formatBytes(snapshot.memoryInfo?.total)}`}
        />
        {disk && (
          <MonitorCard
            icon={<StorageOutlinedIcon fontSize="small" />}
            title={disk.mountpoint || 'Disk'}
            value={diskUsage}
            detail={`${formatBytes(disk.used)} / ${formatBytes(disk.total)}`}
          />
        )}
      </Stack>
    </Box>
  )
}
