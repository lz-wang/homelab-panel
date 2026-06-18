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

import { ItemIcon } from '@/components/common/ItemIcon'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemIcon as ItemIconType, ItemInfo } from '@/types/panel'
import { isValidUrl, normalizeUrl } from '@/utils/url'

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

const materialThemeColors = [
  { name: 'Red', value: '#F44336' },
  { name: 'Pink', value: '#E91E63' },
  { name: 'Purple', value: '#9C27B0' },
  { name: 'Deep Purple', value: '#673AB7' },
  { name: 'Indigo', value: '#3F51B5' },
  { name: 'Blue', value: '#2196F3' },
  { name: 'Light Blue', value: '#03A9F4' },
  { name: 'Cyan', value: '#00BCD4' },
  { name: 'Teal', value: '#009688' },
  { name: 'Green', value: '#4CAF50' },
  { name: 'Light Green', value: '#8BC34A' },
  { name: 'Lime', value: '#CDDC39' },
  { name: 'Yellow', value: '#FFEB3B' },
  { name: 'Amber', value: '#FFC107' },
  { name: 'Orange', value: '#FF9800' },
  { name: 'Deep Orange', value: '#FF5722' },
  { name: 'Brown', value: '#795548' },
  { name: 'Grey', value: '#9E9E9E' },
  { name: 'Blue Grey', value: '#607D8B' },
]

const iconTextColors = [
  { label: '白色', value: '#FFFFFF' },
  { label: '黑色', value: '#000000' },
]

const defaultItem: ItemInfo = {
  icon: defaultIcon,
  title: '',
  url: '',
  lanUrl: '',
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
      return '名称不能为空'

    const url = normalizeUrl(form.url)
    const lanUrl = normalizeUrl(form.lanUrl)

    if (!url)
      return '互联网地址不能为空'

    if (!isValidUrl(url))
      return '互联网地址无效'

    if (lanUrl && !isValidUrl(lanUrl))
      return '局域网地址无效'

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
        description: '',
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
        lanUrl: normalizeUrl(form.lanUrl),
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
  const selectedIconColor = form.icon?.color ?? defaultIconColor

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{item ? t('common.edit') : t('common.add')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <ItemIcon itemIcon={form.icon} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ color: selectedIconColor }}>
                  图标预览
                </Typography>
                <Typography variant="body2" sx={{ color: selectedIconColor, overflowWrap: 'anywhere' }}>
                  {form.icon?.text}
                </Typography>
              </Box>
            </Stack>

            <TextField
              label="名称"
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              fullWidth
              required
            />

            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Iconify 图标"
                  value={form.icon?.text ?? ''}
                  onChange={event => patchIcon({ itemType: 3, text: event.target.value, src: '' })}
                  fullWidth
                  helperText="例如 mdi:application-outline"
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
              <Typography variant="caption" color="text.secondary">
                点击右侧外链可前往 Iconify 图标库自助选择图标。
              </Typography>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">图标和标题颜色</Typography>
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

            <Stack spacing={1}>
              <Typography variant="subtitle2">图标背景色</Typography>
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
              >
                {selectedBackgroundColor}
              </Button>
              <Typography variant="caption" color="text.secondary">
                仅提供 Material Design 主题色块；默认 #2196F3。
              </Typography>
            </Stack>

            <TextField
              label="互联网地址"
              value={form.url}
              onChange={event => setForm({ ...form, url: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label="局域网地址"
              value={form.lanUrl ?? ''}
              onChange={event => setForm({ ...form, lanUrl: event.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="text" disabled={saving} onClick={onClose}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={handleSave}>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={backgroundDialogOpen} onClose={() => setBackgroundDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>选择图标背景色</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1 }}>
            {materialThemeColors.map(color => (
              <Box
                key={color.value}
                component="button"
                type="button"
                aria-label={`选择 ${color.name} ${color.value}`}
                title={`${color.name} ${color.value}`}
                onClick={() => {
                  patchIcon({ backgroundColor: color.value })
                  setBackgroundDialogOpen(false)
                }}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: selectedBackgroundColor.toUpperCase() === color.value
                    ? '3px solid'
                    : '1px solid',
                  borderColor: selectedBackgroundColor.toUpperCase() === color.value
                    ? 'primary.main'
                    : 'divider',
                  bgcolor: color.value,
                  cursor: 'pointer',
                  p: 0,
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setBackgroundDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
