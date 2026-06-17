import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import UploadIcon from '@mui/icons-material/Upload'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useRef, useState } from 'react'

import { deletes, getList, uploadFiles } from '@/api/files'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import type { FileInfo } from '@/types/panel'

interface Props {
  selectable?: boolean
  onSelect?: (url: string) => void
}

type FileKindFilter = 'all' | 'image' | 'other'

const pageSizeOptions = [12, 24, 48]

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
  const [keyword, setKeyword] = useState('')
  const [kindFilter, setKindFilter] = useState<FileKindFilter>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const filteredFiles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return files
      .filter((file) => {
        if (kindFilter === 'image')
          return isImage(file.src)

        if (kindFilter === 'other')
          return !isImage(file.src)

        return true
      })
      .filter((file) => {
        if (!normalizedKeyword)
          return true

        return file.fileName.toLowerCase().includes(normalizedKeyword)
          || file.src.toLowerCase().includes(normalizedKeyword)
      })
      .sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))
  }, [files, keyword, kindFilter])

  const pageCount = Math.max(1, Math.ceil(filteredFiles.length / pageSize))
  const pagedFiles = filteredFiles.slice((page - 1) * pageSize, page * pageSize)
  const pagedSelectedIds = pagedFiles.filter(file => selectedIds.includes(file.id)).map(file => file.id)
  const isCurrentPageSelected = Boolean(pagedFiles.length) && pagedSelectedIds.length === pagedFiles.length

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

  useEffect(() => {
    setPage(1)
  }, [keyword, kindFilter, pageSize])

  useEffect(() => {
    setPage(current => Math.min(current, pageCount))
  }, [pageCount])

  function toggleFile(fileId: number, checked: boolean) {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, fileId])) : prev.filter(id => id !== fileId))
  }

  function toggleCurrentPage(checked: boolean) {
    if (checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pagedFiles.map(file => file.id)])))
      return
    }

    setSelectedIds(prev => prev.filter(id => !pagedFiles.some(file => file.id === id)))
  }

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

  async function handleBatchDelete() {
    const filesToDelete = files.filter(file => selectedIds.includes(file.id))

    if (!filesToDelete.length)
      return

    const ok = await confirm({
      title: t('common.delete'),
      content: `确定删除选中的 ${filesToDelete.length} 个文件吗？`,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    const res = await deletes(filesToDelete.map(file => file.id))

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      setSelectedIds([])
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
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            disabled={!selectedIds.length}
            onClick={handleBatchDelete}
          >
            批量删除
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} loading={loading} onClick={loadFiles}>
            刷新
          </Button>
          <Button startIcon={<UploadIcon />} loading={uploading} onClick={() => inputRef.current?.click()}>
            上传
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
        <TextField
          label="搜索文件"
          value={keyword}
          onChange={event => setKeyword(event.target.value)}
          fullWidth
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>类型</InputLabel>
          <Select
            label="类型"
            value={kindFilter}
            onChange={event => setKindFilter(event.target.value as FileKindFilter)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="image">图片</MenuItem>
            <MenuItem value="other">非图片</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>每页</InputLabel>
          <Select
            label="每页"
            value={pageSize}
            onChange={event => setPageSize(Number(event.target.value))}
          >
            {pageSizeOptions.map(option => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Checkbox
          checked={isCurrentPageSelected}
          indeterminate={Boolean(pagedSelectedIds.length) && !isCurrentPageSelected}
          disabled={!pagedFiles.length}
          onChange={event => toggleCurrentPage(event.target.checked)}
        />
        <Typography variant="body2" color="text.secondary">
          共
          {' '}
          {filteredFiles.length}
          {' '}
          个文件，已选择
          {' '}
          {selectedIds.length}
          {' '}
          个
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 1.5,
        }}
      >
        {pagedFiles.map(file => (
          <Box
            key={file.id}
            sx={{
              position: 'relative',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <Checkbox
              checked={selectedIds.includes(file.id)}
              onChange={event => toggleFile(file.id, event.target.checked)}
              sx={{ position: 'absolute', zIndex: 1, bgcolor: 'rgba(255,255,255,0.72)' }}
            />
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
              {file.createTime && (
                <Typography variant="caption" color="text.secondary" noWrap>{file.createTime}</Typography>
              )}
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

      {pageCount > 1 && (
        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} />
        </Stack>
      )}

      {!filteredFiles.length && !loading && (
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
