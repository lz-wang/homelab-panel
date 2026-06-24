import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog, { type DialogProps } from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemIcon as ItemIconType, ItemIconGroup, ItemInfo } from '@/types/panel'
import { isValidUrl, normalizeUrl } from '@/utils/url'

import { ColorSwatchPicker } from './ColorSwatchPicker'
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
    text: 'mdi:server-network',
    src: '',
    color: defaultIconColor,
    backgroundColor: defaultIconBackgroundColor,
}

const iconifySearchUrl = 'https://icon-sets.iconify.design/'

const iconTextColors = [
    { label: '白色', value: '#FFFFFF' },
    { label: '黑色', value: '#000000' },
]

const defaultItem: ItemInfo = {
    icon: defaultIcon,
    title: '',
    url: '',
    backupUrl: '',
    description: '',
}

type GroupOption = ItemIconGroup & { inputValue?: string }

const filterGroups = createFilterOptions<GroupOption>()

// 卡片单击打开编辑后，短时间内忽略落在遮罩上的关闭动作，
// 避免习惯性双击的第二次点击落在遮罩上把刚打开的弹窗立即关闭。
const backdropDismissGuardMs = 300

export function EditItemDialog({ open, item, itemIconGroupId, onClose, onSaved }: Props) {
    const notify = useNotify()
    const confirm = useConfirm()
    const upsertItem = usePanelStore((s) => s.upsertItem)
    const upsertGroup = usePanelStore((s) => s.upsertGroup)
    const deleteItems = usePanelStore((s) => s.deleteItems)
    const groups = usePanelStore((s) => s.groups)
    const panelConfig = usePanelStore((s) => s.panelConfig)
    const [form, setForm] = useState<ItemInfo>(defaultItem)
    const [saving, setSaving] = useState(false)
    const [copying, setCopying] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [creatingGroup, setCreatingGroup] = useState(false)
    const openTimeRef = useRef(0)

    useEffect(() => {
        if (open) openTimeRef.current = Date.now()
    }, [open])

    const handleDialogClose: NonNullable<DialogProps['onClose']> = (_event, reason) => {
        if (
            reason === 'backdropClick' &&
            Date.now() - openTimeRef.current < backdropDismissGuardMs
        ) {
            return
        }
        onClose()
    }

    useEffect(() => {
        if (!open) return

        const itemIcon = item?.icon

        setForm({
            ...defaultItem,
            ...item,
            icon: {
                ...defaultIcon,
                backgroundColor:
                    itemIcon?.backgroundColor ??
                    panelConfig.appCardDefaultColor ??
                    defaultIcon.backgroundColor,
                color: itemIcon?.color ?? defaultIcon.color,
                text: itemIcon?.itemType === 3 ? itemIcon.text : defaultIcon.text,
                itemType: 3,
                src: '',
            },
            itemIconGroupId: item?.itemIconGroupId ?? itemIconGroupId,
        })
    }, [item, itemIconGroupId, open, panelConfig.appCardDefaultColor])

    function patchIcon(partial: Partial<ItemIconType>) {
        setForm((prev) => ({
            ...prev,
            icon: {
                ...(prev.icon ?? defaultIcon),
                ...partial,
            },
        }))
    }

    function validateForm() {
        if (!form.title.trim()) return '标题不能为空'

        const url = normalizeUrl(form.url)
        if (!url) return '链接不能为空'

        if (!isValidUrl(url)) return '链接无效'

        const backupUrl = form.backupUrl?.trim() ? normalizeUrl(form.backupUrl) : ''
        if (backupUrl && !isValidUrl(backupUrl)) return '备用链接无效'

        if (!form.itemIconGroupId) return '必须选择分组'

        if (!form.icon?.text?.trim()) return 'Iconify 图标不能为空'

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
                url: normalizeUrl(form.url),
                backupUrl: form.backupUrl?.trim() ? normalizeUrl(form.backupUrl) : '',
            })

            if (res.code === 0) {
                notify.success(t('common.saveSuccess'))
                onSaved()
                onClose()
            } else {
                notify.error(`${t('common.saveFail')}:${res.msg}`)
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleCopy() {
        if (!item?.id) return

        setCopying(true)

        try {
            const res = await upsertItem({
                ...item,
                id: undefined,
                title: `${item.title?.trim() || '应用'} 副本`,
            })

            if (res.code === 0) {
                notify.success('已复制该应用')
                onSaved()
                onClose()
            } else {
                notify.error(`${t('common.saveFail')}:${res.msg}`)
            }
        } finally {
            setCopying(false)
        }
    }

    async function handleDelete() {
        if (!item?.id) return

        const ok = await confirm({
            title: t('common.delete'),
            content: t('common.deleteConfirmByName', { name: item.title?.trim() || '该项' }),
            confirmText: t('common.delete'),
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        setDeleting(true)

        try {
            const res = await deleteItems([item.id])

            if (res.code === 0) {
                notify.success(t('common.deleteSuccess'))
                onSaved()
                onClose()
            } else {
                notify.error(`${t('common.deleteFail')}:${res.msg}`)
            }
        } finally {
            setDeleting(false)
        }
    }

    async function handleGroupChange(newValue: GroupOption | null) {
        if (!newValue) {
            setForm((prev) => ({ ...prev, itemIconGroupId: undefined }))
            return
        }

        if (newValue.inputValue) {
            const name = newValue.inputValue
            const beforeIds = new Set(usePanelStore.getState().groups.map((g) => g.id))

            setCreatingGroup(true)

            try {
                const res = await upsertGroup({ title: name })

                if (res.code === 0) {
                    const created = usePanelStore
                        .getState()
                        .groups.find((g) => g.id && !beforeIds.has(g.id))

                    if (created?.id) {
                        setForm((prev) => ({ ...prev, itemIconGroupId: created.id }))
                        notify.success(`已创建分组「${name}」`)
                    }
                } else {
                    notify.error(`${t('common.saveFail')}:${res.msg}`)
                }
            } finally {
                setCreatingGroup(false)
            }

            return
        }

        if (newValue.id) {
            setForm((prev) => ({ ...prev, itemIconGroupId: newValue.id }))
        }
    }

    const selectedGroup = useMemo<GroupOption | null>(
        () => groups.find((g) => g.id === form.itemIconGroupId) ?? null,
        [groups, form.itemIconGroupId],
    )

    const selectedBackgroundColor = form.icon?.backgroundColor ?? defaultIconBackgroundColor
    const selectedIconColor = form.icon?.color ?? defaultIconColor
    const previewTitle = form.title.trim() || '应用标题'
    const previewSubtitle = form.description?.trim()

    return (
        <>
            <Dialog
                open={open}
                onClose={copying || deleting || saving ? undefined : handleDialogClose}
                maxWidth={false}
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            width: { xs: 'calc(100% - 32px)', sm: 760 },
                            maxWidth: 'calc(100% - 32px)',
                            borderRadius: 2,
                        },
                    },
                }}
            >
                <DialogTitle>{item ? t('common.edit') : t('common.add')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 5 }}>
                            <Box
                                sx={{
                                    width: { xs: '100%', sm: 260 },
                                    maxWidth: 288,
                                    height: 80,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2.5,
                                    px: 3,
                                    borderRadius: 3,
                                    bgcolor: selectedBackgroundColor,
                                    color: selectedIconColor,
                                }}
                            >
                                <IconifyIcon icon={form.icon?.text} size={38} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                                        {previewTitle}
                                    </Typography>
                                    {previewSubtitle && (
                                        <Typography variant="caption" noWrap sx={{ opacity: 0.72 }}>
                                            {previewSubtitle}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                label="标题"
                                value={form.title}
                                onChange={(event) =>
                                    setForm({ ...form, title: event.target.value })
                                }
                                fullWidth
                                required
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                label="描述"
                                value={form.description ?? ''}
                                onChange={(event) =>
                                    setForm({ ...form, description: event.target.value })
                                }
                                fullWidth
                                sx={{ flex: 1 }}
                            />
                        </Stack>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
                        >
                            <TextField
                                label="图标"
                                value={form.icon?.text ?? ''}
                                onChange={(event) =>
                                    patchIcon({ itemType: 3, text: event.target.value, src: '' })
                                }
                                fullWidth
                                required
                                sx={{ flex: 1, minWidth: 0 }}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label="打开 Iconify 图标库"
                                                    component="a"
                                                    href={iconifySearchUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    edge="end"
                                                >
                                                    <OpenInNewIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <Autocomplete<GroupOption>
                                fullWidth
                                value={selectedGroup}
                                onChange={(_, newValue) => handleGroupChange(newValue)}
                                filterOptions={(options, params) => {
                                    const filtered = filterGroups(options, params)
                                    const value = params.inputValue.trim()
                                    if (
                                        value &&
                                        !options.some((option) => option.title?.trim() === value)
                                    ) {
                                        filtered.push({
                                            inputValue: value,
                                            title: `创建「${value}」`,
                                        })
                                    }
                                    return filtered
                                }}
                                options={groups}
                                loading={creatingGroup}
                                disabled={creatingGroup}
                                selectOnFocus
                                clearOnBlur
                                handleHomeEndKeys
                                noOptionsText="输入分组名称可创建新分组"
                                getOptionLabel={(option) => option.title ?? ''}
                                isOptionEqualToValue={(option, value) =>
                                    Boolean(option.id && option.id === value.id)
                                }
                                renderInput={(params) => (
                                    <TextField {...params} label="分组" required />
                                )}
                                sx={{ flex: 1, minWidth: 0 }}
                            />
                        </Stack>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.5}
                            sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
                        >
                            <Typography variant="subtitle2" sx={{ minWidth: 88 }}>
                                字体颜色
                            </Typography>
                            <Box sx={{ minWidth: 0 }}>
                                <RadioGroup
                                    row
                                    value={selectedIconColor}
                                    onChange={(event) => patchIcon({ color: event.target.value })}
                                >
                                    {iconTextColors.map((color) => (
                                        <FormControlLabel
                                            key={color.value}
                                            value={color.value}
                                            control={<Radio size="small" />}
                                            label={
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.75,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            width: 14,
                                                            height: 14,
                                                            borderRadius: '50%',
                                                            bgcolor: color.value,
                                                            border: '1px solid',
                                                            borderColor: 'divider',
                                                        }}
                                                    />
                                                    <Typography variant="body2">
                                                        {color.label}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    ))}
                                </RadioGroup>
                            </Box>
                        </Stack>

                        <ColorSwatchPicker
                            label="背景颜色"
                            value={selectedBackgroundColor}
                            onChange={(value) => patchIcon({ backgroundColor: value })}
                        />

                        <TextField
                            label="链接"
                            value={form.url}
                            onChange={(event) => setForm({ ...form, url: event.target.value })}
                            fullWidth
                            required
                        />
                        <TextField
                            label="备用链接"
                            placeholder="浏览模式下右键卡片打开此链接（可选）"
                            value={form.backupUrl ?? ''}
                            onChange={(event) =>
                                setForm({ ...form, backupUrl: event.target.value })
                            }
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
                    {item?.id && (
                        <Stack direction="row" spacing={1} sx={{ mr: 'auto' }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<ContentCopyIcon />}
                                loading={copying}
                                disabled={saving || deleting}
                                onClick={handleCopy}
                            >
                                复制
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                loading={deleting}
                                disabled={saving || copying}
                                onClick={handleDelete}
                            >
                                {t('common.delete')}
                            </Button>
                        </Stack>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<CloseIcon />}
                        disabled={saving || copying || deleting}
                        onClick={onClose}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<CheckIcon />}
                        loading={saving}
                        disabled={copying || deleting}
                        onClick={handleSave}
                    >
                        {t('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
