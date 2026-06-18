import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemIcon as ItemIconType, ItemInfo } from '@/types/panel'
import { isValidUrl, normalizeUrl } from '@/utils/url'

import { IconifyIcon } from './IconifyIcon'

interface Props {
  open: boolean
  item: ItemInfo | null
  itemIconGroupId?: number
  onClose: () => void
  onSaved: () => void
}

const defaultIconBackgroundColor = '#2196F3'
const defaultIconColor = '#FFFFFF'

const defaultIcon: ItemIconType = {
  itemType: 3,
  text: 'mdi:application-outline',
  src: '',
  color: defaultIconColor,
  backgroundColor: defaultIconBackgroundColor,
}

const iconifySearchUrl = 'https://icon-sets.iconify.design/'

const materialColorFamilies = [
  { name: 'RED', shades: [{ strength: '50', hex: '#FFEBEE' }, { strength: '100', hex: '#FFCDD2' }, { strength: '200', hex: '#EF9A9A' }, { strength: '300', hex: '#E57373' }, { strength: '400', hex: '#EF5350' }, { strength: '500', hex: '#F44336' }, { strength: '600', hex: '#E53935' }, { strength: '700', hex: '#D32F2F' }, { strength: '800', hex: '#C62828' }, { strength: '900', hex: '#B71C1C' }, { strength: 'A100', hex: '#FF8A80' }, { strength: 'A200', hex: '#FF5252' }, { strength: 'A400', hex: '#FF1744' }, { strength: 'A700', hex: '#D50000' }] },
  { name: 'PINK', shades: [{ strength: '50', hex: '#FCE4EC' }, { strength: '100', hex: '#F8BBD0' }, { strength: '200', hex: '#F48FB1' }, { strength: '300', hex: '#F06292' }, { strength: '400', hex: '#EC407A' }, { strength: '500', hex: '#E91E63' }, { strength: '600', hex: '#D81B60' }, { strength: '700', hex: '#C2185B' }, { strength: '800', hex: '#AD1457' }, { strength: '900', hex: '#880E4F' }, { strength: 'A100', hex: '#FF80AB' }, { strength: 'A200', hex: '#FF4081' }, { strength: 'A400', hex: '#F50057' }, { strength: 'A700', hex: '#C51162' }] },
  { name: 'PURPLE', shades: [{ strength: '50', hex: '#F3E5F5' }, { strength: '100', hex: '#E1BEE7' }, { strength: '200', hex: '#CE93D8' }, { strength: '300', hex: '#BA68C8' }, { strength: '400', hex: '#AB47BC' }, { strength: '500', hex: '#9C27B0' }, { strength: '600', hex: '#8E24AA' }, { strength: '700', hex: '#7B1FA2' }, { strength: '800', hex: '#6A1B9A' }, { strength: '900', hex: '#4A148C' }, { strength: 'A100', hex: '#EA80FC' }, { strength: 'A200', hex: '#E040FB' }, { strength: 'A400', hex: '#D500F9' }, { strength: 'A700', hex: '#AA00FF' }] },
  { name: 'DEEP PURPLE', shades: [{ strength: '50', hex: '#EDE7F6' }, { strength: '100', hex: '#D1C4E9' }, { strength: '200', hex: '#B39DDB' }, { strength: '300', hex: '#9575CD' }, { strength: '400', hex: '#7E57C2' }, { strength: '500', hex: '#673AB7' }, { strength: '600', hex: '#5E35B1' }, { strength: '700', hex: '#512DA8' }, { strength: '800', hex: '#4527A0' }, { strength: '900', hex: '#311B92' }, { strength: 'A100', hex: '#B388FF' }, { strength: 'A200', hex: '#7C4DFF' }, { strength: 'A400', hex: '#651FFF' }, { strength: 'A700', hex: '#6200EA' }] },
  { name: 'INDIGO', shades: [{ strength: '50', hex: '#E8EAF6' }, { strength: '100', hex: '#C5CAE9' }, { strength: '200', hex: '#9FA8DA' }, { strength: '300', hex: '#7986CB' }, { strength: '400', hex: '#5C6BC0' }, { strength: '500', hex: '#3F51B5' }, { strength: '600', hex: '#3949AB' }, { strength: '700', hex: '#303F9F' }, { strength: '800', hex: '#283593' }, { strength: '900', hex: '#1A237E' }, { strength: 'A100', hex: '#8C9EFF' }, { strength: 'A200', hex: '#536DFE' }, { strength: 'A400', hex: '#3D5AFE' }, { strength: 'A700', hex: '#304FFE' }] },
  { name: 'BLUE', shades: [{ strength: '50', hex: '#E3F2FD' }, { strength: '100', hex: '#BBDEFB' }, { strength: '200', hex: '#90CAF9' }, { strength: '300', hex: '#64B5F6' }, { strength: '400', hex: '#42A5F5' }, { strength: '500', hex: '#2196F3' }, { strength: '600', hex: '#1E88E5' }, { strength: '700', hex: '#1976D2' }, { strength: '800', hex: '#1565C0' }, { strength: '900', hex: '#0D47A1' }, { strength: 'A100', hex: '#82B1FF' }, { strength: 'A200', hex: '#448AFF' }, { strength: 'A400', hex: '#2979FF' }, { strength: 'A700', hex: '#2962FF' }] },
  { name: 'LIGHT BLUE', shades: [{ strength: '50', hex: '#E1F5FE' }, { strength: '100', hex: '#B3E5FC' }, { strength: '200', hex: '#81D4FA' }, { strength: '300', hex: '#4FC3F7' }, { strength: '400', hex: '#29B6F6' }, { strength: '500', hex: '#03A9F4' }, { strength: '600', hex: '#039BE5' }, { strength: '700', hex: '#0288D1' }, { strength: '800', hex: '#0277BD' }, { strength: '900', hex: '#01579B' }, { strength: 'A100', hex: '#80D8FF' }, { strength: 'A200', hex: '#40C4FF' }, { strength: 'A400', hex: '#00B0FF' }, { strength: 'A700', hex: '#0091EA' }] },
  { name: 'CYAN', shades: [{ strength: '50', hex: '#E0F7FA' }, { strength: '100', hex: '#B2EBF2' }, { strength: '200', hex: '#80DEEA' }, { strength: '300', hex: '#4DD0E1' }, { strength: '400', hex: '#26C6DA' }, { strength: '500', hex: '#00BCD4' }, { strength: '600', hex: '#00ACC1' }, { strength: '700', hex: '#0097A7' }, { strength: '800', hex: '#00838F' }, { strength: '900', hex: '#006064' }, { strength: 'A100', hex: '#84FFFF' }, { strength: 'A200', hex: '#18FFFF' }, { strength: 'A400', hex: '#00E5FF' }, { strength: 'A700', hex: '#00B8D4' }] },
  { name: 'TEAL', shades: [{ strength: '50', hex: '#E0F2F1' }, { strength: '100', hex: '#B2DFDB' }, { strength: '200', hex: '#80CBC4' }, { strength: '300', hex: '#4DB6AC' }, { strength: '400', hex: '#26A69A' }, { strength: '500', hex: '#009688' }, { strength: '600', hex: '#00897B' }, { strength: '700', hex: '#00796B' }, { strength: '800', hex: '#00695C' }, { strength: '900', hex: '#004D40' }, { strength: 'A100', hex: '#A7FFEB' }, { strength: 'A200', hex: '#64FFDA' }, { strength: 'A400', hex: '#1DE9B6' }, { strength: 'A700', hex: '#00BFA5' }] },
  { name: 'GREEN', shades: [{ strength: '50', hex: '#E8F5E9' }, { strength: '100', hex: '#C8E6C9' }, { strength: '200', hex: '#A5D6A7' }, { strength: '300', hex: '#81C784' }, { strength: '400', hex: '#66BB6A' }, { strength: '500', hex: '#4CAF50' }, { strength: '600', hex: '#43A047' }, { strength: '700', hex: '#388E3C' }, { strength: '800', hex: '#2E7D32' }, { strength: '900', hex: '#1B5E20' }, { strength: 'A100', hex: '#B9F6CA' }, { strength: 'A200', hex: '#69F0AE' }, { strength: 'A400', hex: '#00E676' }, { strength: 'A700', hex: '#00C853' }] },
  { name: 'LIGHT GREEN', shades: [{ strength: '50', hex: '#F1F8E9' }, { strength: '100', hex: '#DCEDC8' }, { strength: '200', hex: '#C5E1A5' }, { strength: '300', hex: '#AED581' }, { strength: '400', hex: '#9CCC65' }, { strength: '500', hex: '#8BC34A' }, { strength: '600', hex: '#7CB342' }, { strength: '700', hex: '#689F38' }, { strength: '800', hex: '#558B2F' }, { strength: '900', hex: '#33691E' }, { strength: 'A100', hex: '#CCFF90' }, { strength: 'A200', hex: '#B2FF59' }, { strength: 'A400', hex: '#76FF03' }, { strength: 'A700', hex: '#64DD17' }] },
  { name: 'LIME', shades: [{ strength: '50', hex: '#F9FBE7' }, { strength: '100', hex: '#F0F4C3' }, { strength: '200', hex: '#E6EE9C' }, { strength: '300', hex: '#DCE775' }, { strength: '400', hex: '#D4E157' }, { strength: '500', hex: '#CDDC39' }, { strength: '600', hex: '#C0CA33' }, { strength: '700', hex: '#AFB42B' }, { strength: '800', hex: '#9E9D24' }, { strength: '900', hex: '#827717' }, { strength: 'A100', hex: '#F4FF81' }, { strength: 'A200', hex: '#EEFF41' }, { strength: 'A400', hex: '#C6FF00' }, { strength: 'A700', hex: '#AEEA00' }] },
  { name: 'YELLOW', shades: [{ strength: '50', hex: '#FFFDE7' }, { strength: '100', hex: '#FFF9C4' }, { strength: '200', hex: '#FFF59D' }, { strength: '300', hex: '#FFF176' }, { strength: '400', hex: '#FFEE58' }, { strength: '500', hex: '#FFEB3B' }, { strength: '600', hex: '#FDD835' }, { strength: '700', hex: '#FBC02D' }, { strength: '800', hex: '#F9A825' }, { strength: '900', hex: '#F57F17' }, { strength: 'A100', hex: '#FFFF8D' }, { strength: 'A200', hex: '#FFFF00' }, { strength: 'A400', hex: '#FFEA00' }, { strength: 'A700', hex: '#FFD600' }] },
  { name: 'AMBER', shades: [{ strength: '50', hex: '#FFF8E1' }, { strength: '100', hex: '#FFECB3' }, { strength: '200', hex: '#FFE082' }, { strength: '300', hex: '#FFD54F' }, { strength: '400', hex: '#FFCA28' }, { strength: '500', hex: '#FFC107' }, { strength: '600', hex: '#FFB300' }, { strength: '700', hex: '#FFA000' }, { strength: '800', hex: '#FF8F00' }, { strength: '900', hex: '#FF6F00' }, { strength: 'A100', hex: '#FFE57F' }, { strength: 'A200', hex: '#FFD740' }, { strength: 'A400', hex: '#FFC400' }, { strength: 'A700', hex: '#FFAB00' }] },
  { name: 'ORANGE', shades: [{ strength: '50', hex: '#FFF3E0' }, { strength: '100', hex: '#FFE0B2' }, { strength: '200', hex: '#FFCC80' }, { strength: '300', hex: '#FFB74D' }, { strength: '400', hex: '#FFA726' }, { strength: '500', hex: '#FF9800' }, { strength: '600', hex: '#FB8C00' }, { strength: '700', hex: '#F57C00' }, { strength: '800', hex: '#EF6C00' }, { strength: '900', hex: '#E65100' }, { strength: 'A100', hex: '#FFD180' }, { strength: 'A200', hex: '#FFAB40' }, { strength: 'A400', hex: '#FF9100' }, { strength: 'A700', hex: '#FF6D00' }] },
  { name: 'DEEP ORANGE', shades: [{ strength: '50', hex: '#FBE9E7' }, { strength: '100', hex: '#FFCCBC' }, { strength: '200', hex: '#FFAB91' }, { strength: '300', hex: '#FF8A65' }, { strength: '400', hex: '#FF7043' }, { strength: '500', hex: '#FF5722' }, { strength: '600', hex: '#F4511E' }, { strength: '700', hex: '#E64A19' }, { strength: '800', hex: '#D84315' }, { strength: '900', hex: '#BF360C' }, { strength: 'A100', hex: '#FF9E80' }, { strength: 'A200', hex: '#FF6E40' }, { strength: 'A400', hex: '#FF3D00' }, { strength: 'A700', hex: '#DD2C00' }] },
  { name: 'BROWN', shades: [{ strength: '50', hex: '#EFEBE9' }, { strength: '100', hex: '#D7CCC8' }, { strength: '200', hex: '#BCAAA4' }, { strength: '300', hex: '#A1887F' }, { strength: '400', hex: '#8D6E63' }, { strength: '500', hex: '#795548' }, { strength: '600', hex: '#6D4C41' }, { strength: '700', hex: '#5D4037' }, { strength: '800', hex: '#4E342E' }, { strength: '900', hex: '#3E2723' }] },
  { name: 'GREY', shades: [{ strength: '50', hex: '#FAFAFA' }, { strength: '100', hex: '#F5F5F5' }, { strength: '200', hex: '#EEEEEE' }, { strength: '300', hex: '#E0E0E0' }, { strength: '400', hex: '#BDBDBD' }, { strength: '500', hex: '#9E9E9E' }, { strength: '600', hex: '#757575' }, { strength: '700', hex: '#616161' }, { strength: '800', hex: '#424242' }, { strength: '900', hex: '#212121' }] },
  { name: 'BLUE GREY', shades: [{ strength: '50', hex: '#ECEFF1' }, { strength: '100', hex: '#CFD8DC' }, { strength: '200', hex: '#B0BEC5' }, { strength: '300', hex: '#90A4AE' }, { strength: '400', hex: '#78909C' }, { strength: '500', hex: '#607D8B' }, { strength: '600', hex: '#546E7A' }, { strength: '700', hex: '#455A64' }, { strength: '800', hex: '#37474F' }, { strength: '900', hex: '#263238' }] },
  { name: 'BASIC', shades: [{ strength: 'WHITE', hex: '#FFFFFF' }, { strength: 'BLACK', hex: '#000000' }] },
]

const iconTextColors = [
  { label: '白色', value: '#FFFFFF' },
  { label: '黑色', value: '#000000' },
]

const defaultItem: ItemInfo = {
  icon: defaultIcon,
  title: '',
  url: '',
  description: '',
  openMethod: 2,
}

export function EditItemDialog({ open, item, itemIconGroupId, onClose, onSaved }: Props) {
  const notify = useNotify()
  const upsertItem = usePanelStore(s => s.upsertItem)
  const [form, setForm] = useState<ItemInfo>(defaultItem)
  const [saving, setSaving] = useState(false)
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false)

  useEffect(() => {
    if (!open)
      return

    const itemIcon = item?.icon

    setForm({
      ...defaultItem,
      ...item,
      icon: {
        ...defaultIcon,
        backgroundColor: itemIcon?.backgroundColor ?? defaultIcon.backgroundColor,
        color: itemIcon?.color ?? defaultIcon.color,
        text: itemIcon?.itemType === 3 ? itemIcon.text : defaultIcon.text,
        itemType: 3,
        src: '',
      },
      itemIconGroupId: item?.itemIconGroupId ?? itemIconGroupId,
    })
  }, [item, itemIconGroupId, open])

  function patchIcon(partial: Partial<ItemIconType>) {
    setForm(prev => ({
      ...prev,
      icon: {
        ...(prev.icon ?? defaultIcon),
        ...partial,
      },
    }))
  }

  function validateForm() {
    if (!form.title.trim())
      return '标题不能为空'

    const url = normalizeUrl(form.url)
    if (!url)
      return '链接不能为空'

    if (!isValidUrl(url))
      return '链接无效'

    if (!form.itemIconGroupId)
      return '必须选择分组'

    if (!form.icon?.text?.trim())
      return 'Iconify 图标不能为空'

    return ''
  }

  async function handleSave() {
    const error = validateForm()

    if (error) {
      notify.error(error)
      return
    }

    setSaving(true)

    try {
      const res = await upsertItem({
        ...form,
        description: form.description?.trim() ?? '',
        icon: {
          ...defaultIcon,
          ...form.icon,
          itemType: 3,
          src: '',
          color: form.icon?.color ?? defaultIcon.color,
          backgroundColor: form.icon?.backgroundColor ?? defaultIcon.backgroundColor,
        },
        openMethod: 2,
        url: normalizeUrl(form.url),
      })

      if (res.code === 0) {
        notify.success(t('common.saveSuccess'))
        onSaved()
        onClose()
      }
      else {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
      }
    }
    finally {
      setSaving(false)
    }
  }

  const selectedBackgroundColor = form.icon?.backgroundColor ?? defaultIconBackgroundColor
  const selectedBackgroundColorUpper = selectedBackgroundColor.toUpperCase()
  const selectedIconColor = form.icon?.color ?? defaultIconColor
  const previewTitle = form.title.trim() || '应用标题'
  const previewSubtitle = form.description?.trim()

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{item ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Box
              sx={{
                width: { xs: '100%', sm: 280 },
                height: 90,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                px: 4,
                borderRadius: 4,
                bgcolor: selectedBackgroundColor,
                color: selectedIconColor,
              }}
            >
              <IconifyIcon icon={form.icon?.text} size={40} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
                  {previewTitle}
                </Typography>
                {previewSubtitle && (
                  <Typography variant="body2" noWrap sx={{ opacity: 0.72 }}>
                    {previewSubtitle}
                  </Typography>
                )}
              </Box>
            </Box>

            <TextField
              label="标题"
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label="副标题"
              value={form.description ?? ''}
              onChange={event => setForm({ ...form, description: event.target.value })}
              fullWidth
            />

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Iconify 图标"
                  value={form.icon?.text ?? ''}
                  onChange={event => patchIcon({ itemType: 3, text: event.target.value, src: '' })}
                  fullWidth
                  required
                />
                <IconButton
                  aria-label="打开 Iconify 图标库"
                  component="a"
                  href={iconifySearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ mt: 1 }}
                >
                  <OpenInNewIcon />
                </IconButton>
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">字体颜色</Typography>
                <Stack direction="row" spacing={1}>
                  {iconTextColors.map(color => (
                    <Button
                      key={color.value}
                      variant={selectedIconColor === color.value ? 'contained' : 'outlined'}
                      onClick={() => patchIcon({ color: color.value })}
                      sx={{ color: selectedIconColor === color.value ? undefined : color.value }}
                    >
                      {color.label}
                    </Button>
                  ))}
                </Stack>
              </Stack>

              <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">背景颜色</Typography>
                <Button
                  variant="outlined"
                  onClick={() => setBackgroundDialogOpen(true)}
                  startIcon={(
                    <Box
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        bgcolor: selectedBackgroundColor,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  )}
                  sx={{ justifyContent: 'center' }}
                >
                  {selectedBackgroundColorUpper}
                </Button>
              </Stack>
            </Stack>

            <TextField
              label="链接"
              value={form.url}
              onChange={event => setForm({ ...form, url: event.target.value })}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" disabled={saving} onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={handleSave}>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={backgroundDialogOpen} onClose={() => setBackgroundDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>选择背景颜色</DialogTitle>
        <DialogContent>
          <Box sx={{ overflowX: 'auto', pt: 1 }}>
            <Stack spacing={0.75} sx={{ minWidth: 860 }}>
              {materialColorFamilies.map(family => (
                <Box
                  key={family.name}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
                    {family.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {family.shades.map(color => (
                      <Box
                        key={`${family.name}-${color.strength}`}
                        component="button"
                        type="button"
                        aria-label={`选择 ${family.name} ${color.strength} ${color.hex}`}
                        title={`${family.name} ${color.strength} ${color.hex}`}
                        onClick={() => {
                          patchIcon({ backgroundColor: color.hex })
                          setBackgroundDialogOpen(false)
                        }}
                        sx={{
                          width: family.name === 'BASIC' ? 72 : 48,
                          height: 34,
                          borderRadius: 1,
                          border: selectedBackgroundColorUpper === color.hex ? '3px solid' : '1px solid',
                          borderColor: selectedBackgroundColorUpper === color.hex ? 'primary.main' : 'divider',
                          bgcolor: color.hex,
                          cursor: 'pointer',
                          p: 0,
                          position: 'relative',
                          '&::after': {
                            content: `"${color.strength}"`,
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: color.hex === '#000000' ? '#FFFFFF' : '#000000',
                            fontSize: 10,
                            fontWeight: 700,
                            opacity: selectedBackgroundColorUpper === color.hex ? 1 : 0,
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setBackgroundDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
