import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import UploadIcon from '@mui/icons-material/Upload'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import { deletes, getList, uploadFiles } from '@/api/system/file'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import type { FileInfo } from '@/types/panel'

interface Props {
  selectable?: boolean
  onSelect?: (url: string) => void
}

function isImage(url: string) {
  return /\.(?:png|jpe?g|gif|webp|svg|ico)(?:\?.*)?$/i.test(url)
}

export function FileManagerPanel({ selectable = false, onSelect }: Props) {
  const notify = useNotify()
  const confirm = useConfirm()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function loadFiles() {
    setLoading(true)

    try {
      const res = await getList()

      if (res.code === 0)
        setFiles(res.data.list)
      else
        notify.error(`文件列表加载失败:${res.msg}`)
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFiles()
  }, [])

  async function handleUpload(selected?: FileList | null) {
    const nextFiles = Array.from(selected ?? [])

    if (!nextFiles.length)
      return

    setUploading(true)

    try {
      const res = await uploadFiles(nextFiles)

      if (res.code === 0) {
        const successCount = Object.keys(res.data.succMap).length
        notify.success(`上传成功 ${successCount} 个文件`)
        if (res.data.errFiles.length)
          notify.error(`上传失败:${res.data.errFiles.join(', ')}`)
        await loadFiles()
      }
      else {
        notify.error(`上传失败:${res.msg}`)
      }
    }
    finally {
      setUploading(false)
      if (inputRef.current)
        inputRef.current.value = ''
    }
  }

  async function handleDelete(file: FileInfo) {
    const ok = await confirm({
      title: t('common.delete'),
      content: t('common.deleteConfirmByName', { name: file.fileName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    const res = await deletes([file.id])

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      await loadFiles()
    }
    else {
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    notify.success('已复制 URL')
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>文件管理</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} loading={loading} onClick={loadFiles}>
            刷新
          </Button>
          <Button startIcon={<UploadIcon />} loading={uploading} onClick={() => inputRef.current?.click()}>
            上传
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 1.5,
        }}
      >
        {files.map(file => (
          <Box
            key={file.id}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                height: 96,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isImage(file.src)
                ? <Box component="img" src={file.src} alt={file.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Typography variant="caption" color="text.secondary">FILE</Typography>}
            </Box>
            <Stack spacing={0.5} sx={{ p: 1 }}>
              <Tooltip title={file.fileName}>
                <Typography variant="body2" noWrap>{file.fileName}</Typography>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" noWrap>{file.src}</Typography>
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'space-between' }}>
                {selectable && (
                  <Button size="small" onClick={() => onSelect?.(file.src)}>
                    选择
                  </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Tooltip title="复制 URL">
                  <IconButton size="small" onClick={() => copyUrl(file.src)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.delete')}>
                  <IconButton size="small" color="error" onClick={() => handleDelete(file)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Box>

      {!files.length && !loading && (
        <Typography color="text.secondary">暂无文件</Typography>
      )}

      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        onChange={event => handleUpload(event.target.files)}
      />
    </Stack>
  )
}
