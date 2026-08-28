import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'

import { changePassword } from '@/api/admin'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { useApiAction } from '@/hooks/useApiAction'
import { LANGUAGES, useTranslation } from '@/locales'
import { useLocaleStore } from '@/store/locale'
import { usePanelStore } from '@/store/panel'
import { cleanGroup, cleanItem, type HomelabPanelExportV1, isExportV1 } from '@/utils/exportFormat'
import { Section, SettingsSaveButton } from './SettingsShared'

function ChangePasswordSection() {
    const [open, setOpen] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const { loading: saving, run } = useApiAction()
    const { t } = useTranslation()

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
            successMessage: t('settings.passwordChanged'),
            errorMessage: (response) => `${t('common.saveFail')}:${response.msg}`,
        })
        if (res?.code === 0) {
            setOpen(false)
        }
    }

    return (
        <>
            <Section title={t('settings.passwordSection')}>
                <Button
                    startIcon={<ManageAccountsIcon />}
                    onClick={handleOpen}
                    sx={{ width: 'fit-content' }}
                >
                    {t('settings.passwordSection')}
                </Button>
            </Section>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>{t('settings.passwordSection')}</DialogTitle>
                <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                    <TextField
                        label={t('settings.currentPassword')}
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        fullWidth
                        autoComplete="current-password"
                    />
                    <TextField
                        label={t('settings.newPassword')}
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        fullWidth
                        autoComplete="new-password"
                    />
                    <TextField
                        label={t('settings.confirmPassword')}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={mismatch}
                        helperText={mismatch ? t('settings.passwordMismatch') : ''}
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
    const { t } = useTranslation()
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
                notify.error(t('settings.backupFail', { msg: fallback.error }))
                return
            }

            downloadJson(fallback.data)
            notify.success(t('settings.backupSuccess'))
        } finally {
            setExporting(false)
        }
    }

    async function importData(data: HomelabPanelExportV1) {
        const ok = await confirm({
            title: t('settings.restoreDialogTitle'),
            content: t('settings.restoreDialogContent'),
            confirmText: t('settings.restoreBtn'),
            cancelText: t('common.cancel'),
        })

        if (!ok) return

        setImporting(true)

        try {
            const configRes = await setPanelConfig(data.panel)

            if (configRes.code !== 0) {
                notify.error(t('settings.restoreConfigFail', { msg: configRes.msg }))
                return
            }

            for (const entry of data.groups) {
                const groupRes = await upsertGroup(cleanGroup(entry.group))

                if (groupRes.code !== 0) {
                    notify.error(t('settings.restoreGroupFail', { msg: groupRes.msg }))
                    return
                }

                const latest = usePanelStore.getState().groups.at(-1)
                const groupId = latest?.id

                if (!groupId) continue

                const entryItems = entry.items.map((item) => cleanItem(item, groupId))

                if (entryItems.length) {
                    const itemRes = await addItems(entryItems)

                    if (itemRes.code !== 0) {
                        notify.error(t('settings.restoreIconFail', { msg: itemRes.msg }))
                        return
                    }
                }
            }

            await load()
            notify.success(t('settings.restoreSuccess'))
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
                notify.error(t('settings.fileFormatError'))
                return
            }

            await importData(data)
        } catch {
            notify.error(t('settings.fileParseError'))
        }
    }

    return (
        <>
            <Section title={t('settings.backupSection')}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Tooltip title={t('settings.backupHintTitle')} placement="bottom">
                        <span>
                            <Button
                                startIcon={<CloudDownloadIcon />}
                                loading={exporting}
                                onClick={handleExport}
                            >
                                {t('settings.backupBtn')}
                            </Button>
                        </span>
                    </Tooltip>
                    <Button
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        loading={importing}
                        onClick={() => inputRef.current?.click()}
                    >
                        {t('settings.restoreBtn')}
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

function LanguageSection() {
    const { t } = useTranslation()
    const lang = useLocaleStore((s) => s.lang)
    const setLang = useLocaleStore((s) => s.setLang)

    return (
        <Stack spacing={1}>
            <Typography sx={{ fontWeight: 600 }}>{t('settings.language')}</Typography>
            <Select
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
                size="small"
                sx={{ maxWidth: 240 }}
            >
                {LANGUAGES.map((l) => (
                    <MenuItem key={l.code} value={l.code}>
                        {l.label}
                    </MenuItem>
                ))}
            </Select>
            <Typography variant="body2" color="text.secondary">
                {t('settings.languageHint')}
            </Typography>
        </Stack>
    )
}

export function MiscSettingsPanel() {
    return (
        <Stack spacing={3}>
            <LanguageSection />
            <Divider />
            <ChangePasswordSection />
            <Divider />
            <BackupRestoreSection />
        </Stack>
    )
}
