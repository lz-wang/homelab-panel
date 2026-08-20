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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { deletes, getList, uploadFiles } from '@/api/files'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { useTranslation } from '@/locales'
import type { FileInfo } from '@/types/panel'
import { copyToClipboard } from '@/utils/clipboard'

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
    const { t } = useTranslation()
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
                if (kindFilter === 'image') return isImage(file.src)

                if (kindFilter === 'other') return !isImage(file.src)

                return true
            })
            .filter((file) => {
                if (!normalizedKeyword) return true

                return (
                    file.fileName.toLowerCase().includes(normalizedKeyword) ||
                    file.src.toLowerCase().includes(normalizedKeyword)
                )
            })
            .sort((a, b) => (b.createTime ?? '').localeCompare(a.createTime ?? ''))
    }, [files, keyword, kindFilter])

    const pageCount = Math.max(1, Math.ceil(filteredFiles.length / pageSize))
    const pagedFiles = filteredFiles.slice((page - 1) * pageSize, page * pageSize)
    const pagedSelectedIds = pagedFiles
        .filter((file) => selectedIds.includes(file.id))
        .map((file) => file.id)
    const isCurrentPageSelected =
        Boolean(pagedFiles.length) && pagedSelectedIds.length === pagedFiles.length

    const loadFiles = useCallback(async () => {
        setLoading(true)

        try {
            const res = await getList()

            if (res.code === 0) setFiles(res.data.list)
            else notify.error(t('files.listLoadFail', { msg: res.msg }))
        } finally {
            setLoading(false)
        }
    }, [notify, t])

    useEffect(() => {
        loadFiles()
    }, [loadFiles])

    // biome-ignore lint/correctness/useExhaustiveDependencies: reset pagination when any filter input changes.
    useEffect(() => {
        setPage(1)
    }, [keyword, kindFilter, pageSize])

    useEffect(() => {
        setPage((current) => Math.min(current, pageCount))
    }, [pageCount])

    function toggleFile(fileId: number, checked: boolean) {
        setSelectedIds((prev) =>
            checked ? Array.from(new Set([...prev, fileId])) : prev.filter((id) => id !== fileId),
        )
    }

    function toggleCurrentPage(checked: boolean) {
        if (checked) {
            setSelectedIds((prev) =>
                Array.from(new Set([...prev, ...pagedFiles.map((file) => file.id)])),
            )
            return
        }

        setSelectedIds((prev) => prev.filter((id) => !pagedFiles.some((file) => file.id === id)))
    }

    async function handleUpload(selected?: FileList | null) {
        const nextFiles = Array.from(selected ?? [])

        if (!nextFiles.length) return

        setUploading(true)

        try {
            const res = await uploadFiles(nextFiles)

            if (res.code === 0) {
                const successCount = Object.keys(res.data.succMap).length
                notify.success(t('files.uploadSuccess', { count: successCount }))
                if (res.data.errFiles.length)
                    notify.error(t('files.uploadFailErr', { files: res.data.errFiles.join(', ') }))
                await loadFiles()
            } else {
                notify.error(t('files.uploadFailMsg', { msg: res.msg }))
            }
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    async function handleDelete(file: FileInfo) {
        const ok = await confirm({
            title: t('common.delete'),
            content: t('common.deleteConfirmByName', { name: file.fileName }),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        const res = await deletes([file.id])

        if (res.code === 0) {
            notify.success(t('common.deleteSuccess'))
            await loadFiles()
        } else {
            notify.error(`${t('common.deleteFail')}:${res.msg}`)
        }
    }

    async function handleBatchDelete() {
        const filesToDelete = files.filter((file) => selectedIds.includes(file.id))

        if (!filesToDelete.length) return

        const ok = await confirm({
            title: t('common.delete'),
            content: t('files.deleteConfirm', { count: filesToDelete.length }),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        const res = await deletes(filesToDelete.map((file) => file.id))

        if (res.code === 0) {
            notify.success(t('common.deleteSuccess'))
            setSelectedIds([])
            await loadFiles()
        } else {
            notify.error(`${t('common.deleteFail')}:${res.msg}`)
        }
    }

    async function copyUrl(url: string) {
        const ok = await copyToClipboard(url)
        if (ok) notify.success(t('files.urlCopied'))
        else notify.error(t('common.copyFail'))
    }

    return (
        <Stack spacing={2}>
            <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {t('files.title')}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        disabled={!selectedIds.length}
                        onClick={handleBatchDelete}
                    >
                        {t('files.batchDelete')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        loading={loading}
                        onClick={loadFiles}
                    >
                        {t('common.refresh')}
                    </Button>
                    <Button
                        startIcon={<UploadIcon />}
                        loading={uploading}
                        onClick={() => inputRef.current?.click()}
                    >
                        {t('common.upload')}
                    </Button>
                </Stack>
            </Stack>

            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { md: 'center' } }}
            >
                <TextField
                    label={t('files.searchPlaceholder')}
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    fullWidth
                    size="small"
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>{t('files.typeLabel')}</InputLabel>
                    <Select
                        label={t('files.typeLabel')}
                        value={kindFilter}
                        onChange={(event) => setKindFilter(event.target.value as FileKindFilter)}
                    >
                        <MenuItem value="all">{t('files.typeAll')}</MenuItem>
                        <MenuItem value="image">{t('files.typeImage')}</MenuItem>
                        <MenuItem value="other">{t('files.typeOther')}</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>{t('files.pageSizeLabel')}</InputLabel>
                    <Select
                        label={t('files.pageSizeLabel')}
                        value={pageSize}
                        onChange={(event) => setPageSize(Number(event.target.value))}
                    >
                        {pageSizeOptions.map((option) => (
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
                    onChange={(event) => toggleCurrentPage(event.target.checked)}
                />
                <Typography variant="body2" color="text.secondary">
                    {t('files.fileCount', {
                        total: filteredFiles.length,
                        selected: selectedIds.length,
                    })}
                </Typography>
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 1.5,
                }}
            >
                {pagedFiles.map((file) => (
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
                            onChange={(event) => toggleFile(file.id, event.target.checked)}
                            sx={{
                                position: 'absolute',
                                zIndex: 1,
                                bgcolor: 'rgba(255,255,255,0.72)',
                            }}
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
                            {isImage(file.src) ? (
                                <Box
                                    component="img"
                                    src={file.src}
                                    alt={file.fileName}
                                    loading="lazy"
                                    decoding="async"
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <Typography variant="caption" color="text.secondary">
                                    FILE
                                </Typography>
                            )}
                        </Box>
                        <Stack spacing={0.5} sx={{ p: 1 }}>
                            <Tooltip title={file.fileName}>
                                <Typography variant="body2" noWrap>
                                    {file.fileName}
                                </Typography>
                            </Tooltip>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {file.src}
                            </Typography>
                            {file.createTime && (
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {file.createTime}
                                </Typography>
                            )}
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ justifyContent: 'space-between' }}
                            >
                                {selectable && (
                                    <Button size="small" onClick={() => onSelect?.(file.src)}>
                                        {t('common.choose')}
                                    </Button>
                                )}
                                <Box sx={{ flex: 1 }} />
                                <Tooltip title={t('common.copyUrl')}>
                                    <IconButton size="small" onClick={() => copyUrl(file.src)}>
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('common.delete')}>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(file)}
                                    >
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
                    <Pagination
                        count={pageCount}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                    />
                </Stack>
            )}

            {!filteredFiles.length && !loading && (
                <Typography color="text.secondary">{t('files.empty')}</Typography>
            )}

            <input
                ref={inputRef}
                hidden
                multiple
                type="file"
                onChange={(event) => handleUpload(event.target.files)}
            />
        </Stack>
    )
}
