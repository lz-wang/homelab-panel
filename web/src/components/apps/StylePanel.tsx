import SaveIcon from '@mui/icons-material/Save'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { API_SUCCESS_CODE } from '@/api/apiResult'
import { setUserConfig } from '@/api/panel/userConfig'
import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { PanelPanelConfigStyleEnum } from '@/constants/panel'
import { useApiAction } from '@/hooks/useApiAction'
import { t } from '@/locales'
import { builtinBackgrounds, defaultPanelConfig, usePanelStore } from '@/store/panel'
import type { PanelConfig } from '@/types/panel'

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

export function StylePanel() {
  const panelConfig = usePanelStore(s => s.panelConfig)
  const setPanelConfig = usePanelStore(s => s.setPanelConfig)
  const [form, setForm] = useState<PanelConfig>({ ...defaultPanelConfig(), ...panelConfig })
  const { loading: saving, run } = useApiAction()

  useEffect(() => {
    setForm({ ...defaultPanelConfig(), ...panelConfig })
  }, [panelConfig])

  function patch(partial: Partial<PanelConfig>) {
    setForm(prev => ({ ...prev, ...partial }))
  }

  async function handleSave() {
    const res = await run(
      () => setUserConfig({ panel: form }),
      {
        successMessage: t('common.saveSuccess'),
        errorMessage: response => `${t('common.saveFail')}:${response.msg}`,
      },
    )

    if (res?.code === API_SUCCESS_CODE)
      setPanelConfig(form)
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="面板标题"
          value={form.logoText ?? ''}
          onChange={event => patch({ logoText: event.target.value })}
          fullWidth
        />
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>图标样式</InputLabel>
          <Select
            label="图标样式"
            value={form.iconStyle ?? PanelPanelConfigStyleEnum.icon}
            onChange={event => patch({ iconStyle: Number(event.target.value) })}
          >
            <MenuItem value={PanelPanelConfigStyleEnum.icon}>图标</MenuItem>
            <MenuItem value={PanelPanelConfigStyleEnum.info}>信息</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <ImageUploadButton
        label="背景图 URL"
        value={form.backgroundImageSrc ?? ''}
        onChange={value => patch({ backgroundImageSrc: value })}
      />

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>内置背景</Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1,
          }}
        >
          {builtinBackgrounds.map((background) => {
            const selected = form.backgroundImageSrc === background.src

            return (
              <ButtonBase
                key={background.src}
                aria-label={background.label}
                onClick={() => patch({ backgroundImageSrc: background.src })}
                sx={{
                  position: 'relative',
                  aspectRatio: '16 / 9',
                  overflow: 'hidden',
                  borderRadius: 1,
                  border: selected ? '2px solid' : '1px solid',
                  borderColor: selected ? 'primary.main' : 'divider',
                  background: `url(${background.src}) center / cover no-repeat`,
                  boxShadow: selected ? 2 : 0,
                }}
              >
                {selected && (
                  <CheckCircleIcon
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      bgcolor: 'background.paper',
                      borderRadius: '50%',
                    }}
                  />
                )}
              </ButtonBase>
            )
          })}
        </Box>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">背景模糊</Typography>
          <Slider
            min={0}
            max={20}
            value={form.backgroundBlur ?? 0}
            onChange={(_, value) => patch({ backgroundBlur: value as number })}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">背景遮罩</Typography>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={form.backgroundMaskNumber ?? 0}
            onChange={(_, value) => patch({ backgroundMaskNumber: value as number })}
            valueLabelDisplay="auto"
          />
        </Box>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="图标文字颜色"
          type="color"
          value={form.iconTextColor ?? '#ffffff'}
          onChange={event => patch({ iconTextColor: event.target.value })}
          sx={{ width: { xs: '100%', sm: 180 } }}
        />
        <TextField
          label="最大宽度"
          type="number"
          value={form.maxWidth ?? 1200}
          onChange={event => patch({ maxWidth: Number(event.target.value) })}
        />
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>单位</InputLabel>
          <Select
            label="单位"
            value={form.maxWidthUnit ?? 'px'}
            onChange={event => patch({ maxWidthUnit: event.target.value })}
          >
            <MenuItem value="px">px</MenuItem>
            <MenuItem value="%">%</MenuItem>
            <MenuItem value="vw">vw</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="顶部边距 (%)"
          type="number"
          value={form.marginTop ?? 10}
          onChange={event => patch({ marginTop: Number(event.target.value) })}
        />
        <TextField
          label="底部边距 (%)"
          type="number"
          value={form.marginBottom ?? 10}
          onChange={event => patch({ marginBottom: Number(event.target.value) })}
        />
        <TextField
          label="横向边距 (px)"
          type="number"
          value={form.marginX ?? 5}
          onChange={event => patch({ marginX: Number(event.target.value) })}
        />
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
        <BoolField checked={form.clockShowSecond ?? false} label="时钟显示秒" onChange={checked => patch({ clockShowSecond: checked })} />
        <BoolField checked={form.searchBoxShow ?? false} label="显示搜索框" onChange={checked => patch({ searchBoxShow: checked })} />
        <BoolField checked={form.searchBoxSearchIcon ?? false} label="搜索图标" onChange={checked => patch({ searchBoxSearchIcon: checked })} />
        <BoolField checked={form.iconTextInfoHideDescription ?? false} label="隐藏描述" onChange={checked => patch({ iconTextInfoHideDescription: checked })} />
        <BoolField checked={form.iconTextIconHideTitle ?? false} label="隐藏图标标题" onChange={checked => patch({ iconTextIconHideTitle: checked })} />
        <BoolField checked={form.systemMonitorShow ?? false} label="显示系统监控" onChange={checked => patch({ systemMonitorShow: checked })} />
        <BoolField checked={form.systemMonitorShowTitle ?? false} label="显示监控标题" onChange={checked => patch({ systemMonitorShowTitle: checked })} />
        <BoolField checked={form.systemMonitorPublicVisitModeShow ?? false} label="公开模式显示监控" onChange={checked => patch({ systemMonitorPublicVisitModeShow: checked })} />
        <BoolField checked={form.netModeChangeButtonShow ?? false} label="显示网络切换" onChange={checked => patch({ netModeChangeButtonShow: checked })} />
      </Box>

      <TextField
        label="页脚 HTML（仅可信管理员）"
        value={form.footerHtml ?? ''}
        onChange={event => patch({ footerHtml: event.target.value })}
        helperText="页脚内容会作为 HTML 渲染，仅应由可信管理员维护。"
        fullWidth
        multiline
        minRows={3}
      />

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button startIcon={<SaveIcon />} loading={saving} onClick={handleSave}>
          {t('common.save')}
        </Button>
      </Stack>
    </Stack>
  )
}
