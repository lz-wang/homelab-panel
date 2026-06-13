import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useEffect, useState } from 'react'

import { edit } from '@/api/panel/itemIcon'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import type { ItemInfo } from '@/types/panel'

interface Props {
  open: boolean
  item: ItemInfo | null
  itemIconGroupId?: number
  onClose: () => void
  onSaved: () => void
}

const defaultItem: ItemInfo = {
  icon: { itemType: 3, text: 'mdi:application-outline' },
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

  useEffect(() => {
    if (!open)
      return

    setForm({
      ...defaultItem,
      ...item,
      itemIconGroupId: item?.itemIconGroupId ?? itemIconGroupId,
    })
  }, [item, itemIconGroupId, open])

  async function handleSave() {
    setSaving(true)

    try {
      const res = await edit(form)

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{item ? t('common.edit') : t('common.add')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="名称"
            value={form.title}
            onChange={event => setForm({ ...form, title: event.target.value })}
            fullWidth
          />
          <TextField
            label="互联网地址"
            value={form.url}
            onChange={event => setForm({ ...form, url: event.target.value })}
            fullWidth
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
          >
            <MenuItem value={1}>当前窗口</MenuItem>
            <MenuItem value={2}>新窗口</MenuItem>
            <MenuItem value={3}>iframe 弹窗</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={handleSave}>{t('common.confirm')}</Button>
      </DialogActions>
    </Dialog>
  )
}
