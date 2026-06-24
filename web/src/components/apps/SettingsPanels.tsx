import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LinkIcon from '@mui/icons-material/Link'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { changePassword } from '@/api/admin'
import { getList } from '@/api/files'
import { AppIcon } from '@/components/common/AppIcon'
import { ColorSwatchPicker } from '@/components/common/ColorSwatchPicker'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { useApiAction } from '@/hooks/useApiAction'
import { t } from '@/locales'
import { builtinBackgrounds, defaultPanelConfig, usePanelStore } from '@/store/panel'
import type { FileInfo, ItemInfo, PanelConfig } from '@/types/panel'
import { cleanGroup, cleanItem, type HomelabPanelExportV1, isExportV1 } from '@/utils/exportFormat'
import { FaviconCropDialog } from './FaviconCropDialog'

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
            control={
                <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
            }
            label={label}
        />
    )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {title}
            </Typography>
            {children}
        </Stack>
    )
}

function percentValue(value: number | undefined, fallback: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback

    return value
}

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

function normalizeForm(config: PanelConfig): PanelConfig {
    const defaults = defaultPanelConfig()

    return {
        ...defaults,
        ...config,
        marginTop: percentValue(config.marginTop, defaults.marginTop ?? 3),
        marginBottom: percentValue(config.marginBottom, defaults.marginBottom ?? 2),
        marginX: percentValue(config.marginX, defaults.marginX ?? 5),
    }
}

const appCardAspectRatioOptions = [
    { label: '自动', value: 'auto' },
    { label: '16:9', value: '16 / 9' },
    { label: '2:1', value: '2 / 1' },
    { label: '5:2', value: '5 / 2' },
    { label: '3:1', value: '3 / 1' },
]

const appCardGridMinWidth = 200
const appCardGridGap = 18
const homeContentHorizontalPadding = 32

const appCardPreviewItem: ItemInfo = {
    icon: {
        itemType: 3,
        text: 'line-md:github',
        src: '',
        color: '#FFFFFF',
    },
    title: 'GitHub',
    description: 'Hello world',
    url: 'https://github.com',
}

function currentViewportWidth() {
    if (typeof window === 'undefined') return 1280

    return window.innerWidth
}

function useViewportWidth() {
    const [viewportWidth, setViewportWidth] = useState(currentViewportWidth)

    useEffect(() => {
        function handleResize() {
            setViewportWidth(currentViewportWidth())
        }

        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return viewportWidth
}

function appCardAutoWidth(viewportWidth: number, marginX: number | undefined) {
    const horizontalMarginRatio = Math.min(40, Math.max(0, marginX ?? 5) * 2) / 100
    const contentWidth = Math.max(appCardGridMinWidth, viewportWidth - homeContentHorizontalPadding)
    const appAreaWidth = Math.max(appCardGridMinWidth, contentWidth * (1 - horizontalMarginRatio))
    const columnCount = Math.max(
        1,
        Math.floor((appAreaWidth + appCardGridGap) / (appCardGridMinWidth + appCardGridGap)),
    )

    return Math.round((appAreaWidth - (columnCount - 1) * appCardGridGap) / columnCount)
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
                网站图标
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
                    上传图片
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
                    远程图标
                </Button>
                {value?.trim() && (
                    <Button onClick={onClear} color="error">
                        移除自定义图标
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

    useEffect(() => {
        if (open) setUrl(initialValue)
    }, [open, initialValue])

    return (
        <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>远程图标地址</DialogTitle>
            <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                <TextField
                    label="图标 URL"
                    placeholder="https://example.com/favicon.ico"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    autoFocus
                    fullWidth
                />
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel}>取消</Button>
                    <Button variant="contained" onClick={() => onConfirm(url.trim())}>
                        确定
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    )
}

function useSettingsForm() {
    const panelConfig = usePanelStore((s) => s.panelConfig)
    const setPanelConfig = usePanelStore((s) => s.setPanelConfig)
    const [form, setForm] = useState<PanelConfig>(() => normalizeForm(panelConfig))
    const { loading: saving, run } = useApiAction()
    const initialFaviconRef = useRef(panelConfig.faviconSrc)

    useEffect(() => {
        setForm(normalizeForm(panelConfig))
    }, [panelConfig])

    function patch(partial: Partial<PanelConfig>) {
        setForm((prev) => ({ ...prev, ...partial }))
    }

    async function handleSave() {
        const faviconChanged = initialFaviconRef.current !== form.faviconSrc
        await run(async () => setPanelConfig(form), {
            successMessage: faviconChanged
                ? '网站图标已保存，刷新页面以查看效果'
                : t('common.saveSuccess'),
            errorMessage: (response) => `${t('common.saveFail')}:${response.msg}`,
        })
        if (faviconChanged) {
            initialFaviconRef.current = form.faviconSrc
        }
    }

    return { form, patch, handleSave, saving }
}

function SettingsSaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
    return (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button startIcon={<SaveIcon />} loading={saving} onClick={onSave}>
                {t('common.save')}
            </Button>
        </Stack>
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
            label: bg.label,
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
                页面背景
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

    return (
        <Stack spacing={3}>
            <Section title="页面布局">
                <TextField
                    label="面板标题"
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
                            背景模糊
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
                            背景遮罩
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
                        label="顶部边距 (%)"
                        type="number"
                        value={form.marginTop ?? 3}
                        onChange={(event) => patch({ marginTop: Number(event.target.value) })}
                        {...marginInputProps(0, 30)}
                    />
                    <TextField
                        label="底部边距 (%)"
                        type="number"
                        value={form.marginBottom ?? 2}
                        onChange={(event) => patch({ marginBottom: Number(event.target.value) })}
                        {...marginInputProps(0, 30)}
                    />
                    <TextField
                        label="横向边距 (%)"
                        type="number"
                        value={form.marginX ?? 5}
                        onChange={(event) => patch({ marginX: Number(event.target.value) })}
                        {...marginInputProps(0, 20)}
                    />
                </Box>
            </Section>

            <Divider />

            <Section title="面板显示">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <BoolField
                        checked={form.clockShow ?? true}
                        label="显示时钟"
                        onChange={(checked) => patch({ clockShow: checked })}
                    />
                    <BoolField
                        checked={form.clockShowSecond ?? false}
                        label="显示秒数"
                        onChange={(checked) => patch({ clockShowSecond: checked })}
                    />
                    <BoolField
                        checked={form.searchBoxShow ?? false}
                        label="显示搜索框"
                        onChange={(checked) => patch({ searchBoxShow: checked })}
                    />
                </Box>
            </Section>

            <SettingsSaveButton saving={saving} onSave={handleSave} />
        </Stack>
    )
}

export function AppSettingsPanel() {
    const { form, patch, handleSave, saving } = useSettingsForm()
    const viewportWidth = useViewportWidth()
    const appCardAspectRatio =
        form.appCardAspectRatio && form.appCardAspectRatio !== 'auto'
            ? form.appCardAspectRatio
            : undefined
    const previewCardWidth = appCardAutoWidth(viewportWidth, form.marginX)

    return (
        <Stack spacing={3}>
            <Section title="应用卡片预览">
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'rgba(15, 23, 42, 0.28)',
                    }}
                >
                    <Box sx={{ width: previewCardWidth, maxWidth: '100%', mx: 'auto' }}>
                        <AppIcon
                            item={appCardPreviewItem}
                            showDescription={form.iconTextInfoShowDescription ?? false}
                            borderRadius={form.appCardRadius ?? 16}
                            aspectRatio={appCardAspectRatio}
                            defaultBackgroundColor={form.appCardDefaultColor ?? '#2196F3'}
                        />
                    </Box>
                </Box>
            </Section>

            <Divider />

            <Section title="应用显示">
                <BoolField
                    checked={form.iconTextInfoShowDescription ?? false}
                    label="显示描述"
                    onChange={(checked) => patch({ iconTextInfoShowDescription: checked })}
                />

                <Box>
                    <Typography variant="body2" color="text.secondary">
                        应用卡片圆角
                    </Typography>
                    <Slider
                        min={0}
                        max={64}
                        step={1}
                        value={form.appCardRadius ?? 20}
                        onChange={(_, value) => patch({ appCardRadius: value as number })}
                        valueLabelDisplay="auto"
                    />
                </Box>

                <TextField
                    select
                    label="应用卡片长宽比例"
                    value={form.appCardAspectRatio ?? 'auto'}
                    onChange={(event) => patch({ appCardAspectRatio: event.target.value })}
                    fullWidth
                >
                    {appCardAspectRatioOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                <ColorSwatchPicker
                    label="默认颜色"
                    value={form.appCardDefaultColor ?? '#2196F3'}
                    onChange={(value) => patch({ appCardDefaultColor: value })}
                />
            </Section>
            <SettingsSaveButton saving={saving} onSave={handleSave} />
        </Stack>
    )
}

function ChangePasswordSection() {
    const [open, setOpen] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const { loading: saving, run } = useApiAction()

    const mismatch = Boolean(newPassword && confirmPassword && newPassword !== confirmPassword)

    function handleOpen() {
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setOpen(true)
    }

    async function handleChangePassword() {
        if (!oldPassword || !newPassword || !confirmPassword || mismatch) return

        const res = await run(async () => changePassword(oldPassword, newPassword), {
            successMessage: '密码修改成功',
            errorMessage: (response) => `${t('common.saveFail')}:${response.msg}`,
        })
        if (res?.code === 0) {
            setOpen(false)
        }
    }

    return (
        <>
            <Section title="修改密码">
                <Button
                    startIcon={<ManageAccountsIcon />}
                    onClick={handleOpen}
                    sx={{ width: 'fit-content' }}
                >
                    修改密码
                </Button>
            </Section>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>修改密码</DialogTitle>
                <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                    <TextField
                        label="当前密码"
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        fullWidth
                        autoComplete="current-password"
                    />
                    <TextField
                        label="新密码"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        fullWidth
                        autoComplete="new-password"
                    />
                    <TextField
                        label="确认新密码"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={mismatch}
                        helperText={mismatch ? '两次输入的密码不一致' : ''}
                        fullWidth
                        autoComplete="new-password"
                    />
                    <SettingsSaveButton saving={saving} onSave={handleChangePassword} />
                </Stack>
            </Dialog>
        </>
    )
}

function downloadJson(data: HomelabPanelExportV1) {
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `homelab-panel-${data.exportedAt.slice(0, 19).replace(/:/g, '-')}.json`
    link.click()
    URL.revokeObjectURL(url)
}

type FrontendBackupResult = { data: HomelabPanelExportV1 } | { data?: never; error: string }

function BackupRestoreSection() {
    const notify = useNotify()
    const confirm = useConfirm()
    const load = usePanelStore((s) => s.load)
    const panelConfig = usePanelStore((s) => s.panelConfig)
    const groups = usePanelStore((s) => s.groups)
    const items = usePanelStore((s) => s.items)
    const setPanelConfig = usePanelStore((s) => s.setPanelConfig)
    const upsertGroup = usePanelStore((s) => s.upsertGroup)
    const addItems = usePanelStore((s) => s.addItems)
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)

    function buildFrontendBackup(): FrontendBackupResult {
        return {
            data: {
                version: 1,
                exportedAt: new Date().toISOString(),
                panel: panelConfig,
                groups: groups.map((group) => {
                    const groupItems = items.filter((item) => item.itemIconGroupId === group.id)
                    return { group, items: groupItems }
                }),
            },
        }
    }

    async function handleExport() {
        setExporting(true)

        try {
            const fallback = buildFrontendBackup()

            if ('error' in fallback) {
                notify.error(`备份失败:${fallback.error}`)
                return
            }

            downloadJson(fallback.data)
            notify.success('备份成功')
        } finally {
            setExporting(false)
        }
    }

    async function importData(data: HomelabPanelExportV1) {
        const ok = await confirm({
            title: '恢复配置',
            content:
                '恢复会保存面板配置，并将备份中的分组和图标作为新数据添加。当前版本使用前端顺序恢复，不会清空现有数据。',
            confirmText: '恢复',
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        setImporting(true)

        try {
            const configRes = await setPanelConfig(data.panel)

            if (configRes.code !== 0) {
                notify.error(`恢复面板配置失败:${configRes.msg}`)
                return
            }

            for (const entry of data.groups) {
                const groupRes = await upsertGroup(cleanGroup(entry.group))

                if (groupRes.code !== 0) {
                    notify.error(`恢复分组失败:${groupRes.msg}`)
                    return
                }

                const latest = usePanelStore.getState().groups.at(-1)
                const groupId = latest?.id

                if (!groupId) continue

                const entryItems = entry.items.map((item) => cleanItem(item, groupId))

                if (entryItems.length) {
                    const itemRes = await addItems(entryItems)

                    if (itemRes.code !== 0) {
                        notify.error(`恢复图标失败:${itemRes.msg}`)
                        return
                    }
                }
            }

            await load()
            notify.success('恢复成功')
        } finally {
            setImporting(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    async function handleFile(file?: File) {
        if (!file) return

        try {
            const data = JSON.parse(await file.text()) as unknown

            if (!isExportV1(data)) {
                notify.error('文件格式不正确')
                return
            }

            await importData(data)
        } catch {
            notify.error('文件解析失败')
        }
    }

    return (
        <>
            <Section title="配置备份恢复">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Tooltip
                        title="当前备份包含面板配置、分组和图标；不包含用户、密码和文件。"
                        placement="bottom"
                    >
                        <span>
                            <Button
                                startIcon={<CloudDownloadIcon />}
                                loading={exporting}
                                onClick={handleExport}
                            >
                                备份
                            </Button>
                        </span>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        loading={importing}
                        onClick={() => inputRef.current?.click()}
                    >
                        恢复
                    </Button>
                </Stack>
            </Section>
            <input
                ref={inputRef}
                hidden
                type="file"
                accept="application/json,.json"
                onChange={(event) => handleFile(event.target.files?.[0])}
            />
        </>
    )
}

export function MiscSettingsPanel() {
    return (
        <Stack spacing={3}>
            <ChangePasswordSection />
            <Divider />
            <BackupRestoreSection />
        </Stack>
    )
}
