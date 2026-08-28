import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LinkIcon from '@mui/icons-material/Link'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { getList } from '@/api/files'
import { useTranslation } from '@/locales'
import { builtinBackgrounds } from '@/store/panel'
import type { FileInfo } from '@/types/panel'
import { FaviconCropDialog } from './FaviconCropDialog'
import { BoolField, Section, SettingsSaveButton, useSettingsForm } from './SettingsShared'

function marginInputProps(min: number, max: number) {
    return {
        slotProps: {
            htmlInput: {
                min,
                max,
                step: 1,
            },
        },
    }
}

interface FaviconSettingSectionProps {
    value: string | undefined
    onPatch: (src: string) => void
    onClear: () => void
}

function FaviconSettingSection({ value, onPatch, onClear }: FaviconSettingSectionProps) {
    const [cropOpen, setCropOpen] = useState(false)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [remoteOpen, setRemoteOpen] = useState(false)
    const previewSrc = value?.trim() ? value : '/favicon.svg'
    const { t } = useTranslation()

    function handleFile(file: File) {
        const reader = new FileReader()
        reader.onload = () => {
            setImageSrc(reader.result as string)
            setCropOpen(true)
        }
        reader.readAsDataURL(file)
    }

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('settings.faviconSection')}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Box
                    component="img"
                    src={previewSrc}
                    alt="favicon"
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 0.5,
                        objectFit: 'contain',
                    }}
                />
                <Button component="label" startIcon={<CloudUploadIcon />} variant="outlined">
                    {t('settings.uploadImage')}
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) handleFile(file)
                            event.target.value = ''
                        }}
                    />
                </Button>
                <Button
                    startIcon={<LinkIcon />}
                    variant="outlined"
                    onClick={() => setRemoteOpen(true)}
                >
                    {t('settings.remoteIcon')}
                </Button>
                {value?.trim() && (
                    <Button onClick={onClear} color="error">
                        {t('settings.removeCustomIcon')}
                    </Button>
                )}
            </Stack>
            {cropOpen && imageSrc && (
                <FaviconCropDialog
                    imageSrc={imageSrc}
                    onCancel={() => {
                        setCropOpen(false)
                        setImageSrc(null)
                    }}
                    onConfirm={(url) => {
                        onPatch(url)
                        setCropOpen(false)
                        setImageSrc(null)
                    }}
                />
            )}
            <RemoteFaviconDialog
                open={remoteOpen}
                initialValue={value ?? ''}
                onCancel={() => setRemoteOpen(false)}
                onConfirm={(url) => {
                    onPatch(url)
                    setRemoteOpen(false)
                }}
            />
        </Box>
    )
}

interface RemoteFaviconDialogProps {
    open: boolean
    initialValue: string
    onCancel: () => void
    onConfirm: (url: string) => void
}

function RemoteFaviconDialog({
    open,
    initialValue,
    onCancel,
    onConfirm,
}: RemoteFaviconDialogProps) {
    const [url, setUrl] = useState(initialValue)
    const { t } = useTranslation()

    useEffect(() => {
        if (open) setUrl(initialValue)
    }, [open, initialValue])

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>{t('settings.remoteIconDialogTitle')}</DialogTitle>
            <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                <TextField
                    label={t('settings.iconUrlLabel')}
                    placeholder="https://example.com/favicon.ico"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    autoFocus
                    fullWidth
                />
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button variant="contained" onClick={() => onConfirm(url.trim())}>
                        {t('settings.ok')}
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    )
}

function isImageUrl(url: string) {
    return /\.(?:png|jpe?g|gif|webp|svg|ico)(?:\?.*)?$/i.test(url)
}

interface BackgroundSettingSectionProps {
    value: string | undefined
    onPatch: (src: string) => void
}

// 页面背景选择：内置背景 + 文件管理中已上传的图片，均可直接选取。
// 上传仍在「文件管理」中进行，这里仅加载并展示已上传图片供选取。
function BackgroundSettingSection({ value, onPatch }: BackgroundSettingSectionProps) {
    const [uploaded, setUploaded] = useState<FileInfo[]>([])
    const { t } = useTranslation()

    useEffect(() => {
        let cancelled = false

        getList().then((res) => {
            if (!cancelled && res.code === 0) {
                setUploaded(res.data.list.filter((file) => isImageUrl(file.src)))
            }
        })

        return () => {
            cancelled = true
        }
    }, [])

    const options = [
        ...builtinBackgrounds.map((bg) => ({
            key: `builtin-${bg.src}`,
            src: bg.src,
            label: t(bg.labelKey),
        })),
        ...uploaded.map((file) => ({
            key: `file-${file.id}`,
            src: file.src,
            label: file.fileName,
        })),
    ]

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('settings.pageBackground')}
            </Typography>
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    pb: 0.5,
                    '&::-webkit-scrollbar': { height: 4 },
                    '&::-webkit-scrollbar-thumb': {
                        borderRadius: 2,
                        bgcolor: 'divider',
                    },
                }}
            >
                {options.map((option) => {
                    const selected = value === option.src

                    return (
                        <ButtonBase
                            key={option.key}
                            aria-label={option.label}
                            onClick={() => onPatch(option.src)}
                            sx={{
                                position: 'relative',
                                flexShrink: 0,
                                width: 120,
                                aspectRatio: '16 / 9',
                                overflow: 'hidden',
                                borderRadius: 1,
                                border: selected ? '2px solid' : '1px solid',
                                borderColor: selected ? 'primary.main' : 'divider',
                                background: `url(${option.src}) center / cover no-repeat`,
                                boxShadow: selected ? 2 : 0,
                            }}
                        >
                            {selected && (
                                <CheckCircleIcon
                                    color="primary"
                                    sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
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
    )
}

export function PageSettingsPanel() {
    const { form, patch, handleSave, saving } = useSettingsForm()
    const { t } = useTranslation()

    return (
        <Stack spacing={3}>
            <Section title={t('settings.layoutSection')}>
                <TextField
                    label={t('settings.panelTitle')}
                    value={form.logoText ?? ''}
                    onChange={(event) => patch({ logoText: event.target.value })}
                    fullWidth
                />

                <FaviconSettingSection
                    value={form.faviconSrc}
                    onPatch={(src) => patch({ faviconSrc: src })}
                    onClear={() => patch({ faviconSrc: '' })}
                />

                <BackgroundSettingSection
                    value={form.backgroundImageSrc}
                    onPatch={(src) => patch({ backgroundImageSrc: src })}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {t('settings.bgBlur')}
                        </Typography>
                        <Slider
                            min={0}
                            max={20}
                            value={form.backgroundBlur ?? 0}
                            onChange={(_, value) => patch({ backgroundBlur: value as number })}
                            valueLabelDisplay="auto"
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {t('settings.bgMask')}
                        </Typography>
                        <Slider
                            min={0}
                            max={1}
                            step={0.05}
                            value={form.backgroundMaskNumber ?? 0}
                            onChange={(_, value) =>
                                patch({ backgroundMaskNumber: value as number })
                            }
                            valueLabelDisplay="auto"
                        />
                    </Box>
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(3, minmax(0, 1fr))',
                        },
                        gap: 2,
                    }}
                >
                    <TextField
                        label={t('settings.marginTop')}
                        type="number"
                        value={form.marginTop ?? 3}
                        onChange={(event) => patch({ marginTop: Number(event.target.value) })}
                        {...marginInputProps(0, 30)}
                    />
                    <TextField
                        label={t('settings.marginBottom')}
                        type="number"
                        value={form.marginBottom ?? 2}
                        onChange={(event) => patch({ marginBottom: Number(event.target.value) })}
                        {...marginInputProps(0, 30)}
                    />
                    <TextField
                        label={t('settings.marginX')}
                        type="number"
                        value={form.marginX ?? 5}
                        onChange={(event) => patch({ marginX: Number(event.target.value) })}
                        {...marginInputProps(0, 20)}
                    />
                </Box>
            </Section>

            <Divider />

            <Section title={t('settings.displaySection')}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <BoolField
                        checked={form.clockShow ?? true}
                        label={t('settings.showClock')}
                        onChange={(checked) => patch({ clockShow: checked })}
                    />
                    <BoolField
                        checked={form.clockShowSecond ?? false}
                        label={t('settings.showSeconds')}
                        onChange={(checked) => patch({ clockShowSecond: checked })}
                    />
                    <BoolField
                        checked={form.searchBoxShow ?? false}
                        label={t('settings.showSearch')}
                        onChange={(checked) => patch({ searchBoxShow: checked })}
                    />
                </Box>
            </Section>

            <SettingsSaveButton saving={saving} onSave={handleSave} />
        </Stack>
    )
}
