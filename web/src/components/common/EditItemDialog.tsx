import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { edit, getSiteFavicon } from '@/api/panel/itemIcon'
import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { ItemIcon } from '@/components/common/ItemIcon'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import type { ItemIcon as ItemIconType, ItemInfo } from '@/types/panel'
import { isValidUrl, normalizeUrl } from '@/utils/url'

interface Props {
  open: boolean
  item: ItemInfo | null
  itemIconGroupId?: number
  onClose: () => void
  onSaved: () => void
}

const defaultIcon: ItemIconType = {
  itemType: 3,
  text: 'mdi:application-outline',
  src: '',
  backgroundColor: '#2a2a2a',
}

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
  const [form, setForm] = useState<ItemInfo>(defaultItem)
  const [saving, setSaving] = useState(false)
  const [fetchingFavicon, setFetchingFavicon] = useState(false)

  useEffect(() => {
    if (!open)
      return

    setForm({
      ...defaultItem,
      ...item,
      icon: {
        ...defaultIcon,
        ...item?.icon,
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

    if (![1, 2, 3].includes(form.openMethod))
      return '打开方式无效'

    if (!form.itemIconGroupId)
      return '必须选择分组'

    if (!form.icon?.itemType)
      return '必须选择图标类型'

    if (form.icon.itemType === 1 && !form.icon.text?.trim())
      return '文字图标内容不能为空'

    if (form.icon.itemType === 2 && !form.icon.src?.trim())
      return '图片图标地址不能为空'

    if (form.icon.itemType === 3 && !form.icon.text?.trim())
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
      const res = await edit({
        ...form,
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

  async function handleFetchFavicon() {
    if (!form.url.trim()) {
      notify.error('请先填写互联网地址')
      return
    }

    setFetchingFavicon(true)

    try {
      const res = await getSiteFavicon({ url: form.url })

      if (res.code === 0 && res.data.iconUrl) {
        patchIcon({ itemType: 2, src: res.data.iconUrl })
        notify.success('获取成功')
      }
      else {
        notify.error(res.msg || '获取失败')
      }
    }
    catch {
      notify.error('获取失败')
    }
    finally {
      setFetchingFavicon(false)
    }
  }

  const iconType = form.icon?.itemType ?? 3

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item ? t('common.edit') : t('common.add')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <ItemIcon itemIcon={form.icon} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">图标预览</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {form.icon?.itemType === 2 ? form.icon.src : form.icon?.text}
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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>图标类型</InputLabel>
              <Select
                label="图标类型"
                value={iconType}
                onChange={(event) => {
                  const itemType = Number(event.target.value)

                  patchIcon({
                    itemType,
                    text: itemType === 1 ? (form.title.slice(0, 1) || 'A') : itemType === 3 ? 'mdi:application-outline' : form.icon?.text,
                    src: itemType === 2 ? form.icon?.src : '',
                  })
                }}
              >
                <MenuItem value={1}>文字</MenuItem>
                <MenuItem value={2}>图片</MenuItem>
                <MenuItem value={3}>Iconify</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="图标背景色"
              type="color"
              value={form.icon?.backgroundColor ?? '#2a2a2a'}
              onChange={event => patchIcon({ backgroundColor: event.target.value })}
              sx={{ width: { xs: '100%', sm: 160 } }}
            />
          </Stack>

          {iconType === 1 && (
            <TextField
              label="文字图标内容"
              value={form.icon?.text ?? ''}
              onChange={event => patchIcon({ text: event.target.value })}
              fullWidth
              required
            />
          )}

          {iconType === 2 && (
            <Stack spacing={1}>
              <ImageUploadButton
                label="图片图标 URL"
                value={form.icon?.src ?? ''}
                onChange={value => patchIcon({ src: value })}
              />
              <Button
                variant="outlined"
                startIcon={<AutoFixHighIcon />}
                loading={fetchingFavicon}
                onClick={handleFetchFavicon}
              >
                自动获取站点 favicon
              </Button>
            </Stack>
          )}

          {iconType === 3 && (
            <TextField
              label="Iconify 图标"
              value={form.icon?.text ?? ''}
              onChange={event => patchIcon({ text: event.target.value })}
              fullWidth
              helperText="例如 mdi:application-outline"
              required
            />
          )}

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
          <TextField
            label="描述"
            value={form.description ?? ''}
            onChange={event => setForm({ ...form, description: event.target.value })}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="打开方式"
            select
            value={form.openMethod}
            onChange={event => setForm({ ...form, openMethod: Number(event.target.value) })}
            fullWidth
            helperText={form.openMethod === 3 ? '部分站点可能因 X-Frame-Options 无法嵌入 iframe。' : undefined}
          >
            <MenuItem value={1}>当前窗口</MenuItem>
            <MenuItem value={2}>新窗口</MenuItem>
            <MenuItem value={3}>iframe 弹窗</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" disabled={saving} onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={handleSave}>{t('common.confirm')}</Button>
      </DialogActions>
    </Dialog>
  )
}
