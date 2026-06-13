import SaveIcon from '@mui/icons-material/Save'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { getByName, save } from '@/api/system/moduleConfig'
import { getDiskMountpoints } from '@/api/system/systemMonitor'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import {
  defaultSystemMonitorConfig,
  systemMonitorConfigName,
  type SystemMonitorConfig,
} from '@/types/systemMonitor'

function BoolField({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <FormControlLabel
      control={<Switch checked={checked} onChange={event => onChange(event.target.checked)} />}
      label={label}
    />
  )
}

export function SystemMonitorSettingsPanel() {
  const notify = useNotify()
  const [form, setForm] = useState<SystemMonitorConfig>(defaultSystemMonitorConfig())
  const [mountpoints, setMountpoints] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [configRes, mountpointRes] = await Promise.all([
        getByName<Partial<SystemMonitorConfig>>(systemMonitorConfigName),
        getDiskMountpoints(),
      ])

      if (configRes.code === 0)
        setForm({ ...defaultSystemMonitorConfig(), ...(configRes.data ?? {}) })

      if (mountpointRes.code === 0)
        setMountpoints(mountpointRes.data)
    }

    load()
  }, [])

  function patch(partial: Partial<SystemMonitorConfig>) {
    setForm(prev => ({ ...prev, ...partial }))
  }

  async function handleSave() {
    const refreshIntervalSeconds = Math.max(3, Math.min(3600, Number(form.refreshIntervalSeconds) || 10))
    const next = { ...form, refreshIntervalSeconds }

    setSaving(true)

    try {
      const res = await save(systemMonitorConfigName, next)

      if (res.code === 0) {
        setForm(next)
        notify.success(t('common.saveSuccess'))
      }
      else {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
      }
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>系统监控配置</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="刷新周期（秒）"
          type="number"
          value={form.refreshIntervalSeconds}
          onChange={event => patch({ refreshIntervalSeconds: Number(event.target.value) })}
          slotProps={{ htmlInput: { min: 3, max: 3600 } }}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>磁盘挂载点</InputLabel>
          <Select
            label="磁盘挂载点"
            value={form.diskMountpoint ?? ''}
            onChange={event => patch({ diskMountpoint: event.target.value })}
          >
            <MenuItem value="">自动选择</MenuItem>
            {mountpoints.map(mountpoint => (
              <MenuItem key={mountpoint} value={mountpoint}>{mountpoint}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack spacing={0.5}>
        <BoolField checked={form.enabled} label="启用系统监控" onChange={checked => patch({ enabled: checked })} />
        <BoolField checked={form.showTitle} label="显示标题" onChange={checked => patch({ showTitle: checked })} />
        <BoolField checked={form.publicVisible} label="允许公开模式显示" onChange={checked => patch({ publicVisible: checked })} />
        <BoolField checked={form.showCpu} label="显示 CPU" onChange={checked => patch({ showCpu: checked })} />
        <BoolField checked={form.showMemory} label="显示内存" onChange={checked => patch({ showMemory: checked })} />
        <BoolField checked={form.showDisk} label="显示磁盘" onChange={checked => patch({ showDisk: checked })} />
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button startIcon={<SaveIcon />} loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </Stack>
    </Stack>
  )
}
