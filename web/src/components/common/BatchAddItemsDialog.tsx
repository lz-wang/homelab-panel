import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useEffect, useState } from 'react'

import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemInfo } from '@/types/panel'
import { normalizeUrl, titleFromUrl } from '@/utils/url'

interface Props {
  open: boolean
  itemIconGroupId?: number
  onClose: () => void
  onSaved: () => void
}

export function BatchAddItemsDialog({ open, itemIconGroupId, onClose, onSaved }: Props) {
  const notify = useNotify()
  const addItems = usePanelStore(s => s.addItems)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open)
      setValue('')
  }, [open])

  async function handleSave() {
    if (!itemIconGroupId) {
      notify.error('必须选择分组')
      return
    }

    const urls = value
      .split(/\r?\n/)
      .map(normalizeUrl)
      .filter(Boolean)

    if (!urls.length) {
      notify.error('请至少输入一个 URL')
      return
    }

    const items: ItemInfo[] = []

    for (const url of urls) {
      try {
        const parsed = new URL(url)
        items.push({
          itemIconGroupId,
          title: titleFromUrl(url),
          url: parsed.toString(),
          lanUrl: '',
          description: '',
          openMethod: 2,
          icon: {
            itemType: 3,
            text: 'mdi:application-outline',
            backgroundColor: '#2a2a2a',
          },
        })
      }
      catch {
        notify.error(`URL 无效:${url}`)
        return
      }
    }

    setSaving(true)

    try {
      const res = await addItems(items)

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
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>批量添加</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="每行一个 URL"
            value={value}
            onChange={event => setValue(event.target.value)}
            fullWidth
            multiline
            minRows={8}
            placeholder="https://example.com"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" disabled={saving} onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={saving} onClick={handleSave}>{t('common.confirm')}</Button>
      </DialogActions>
    </Dialog>
  )
}
