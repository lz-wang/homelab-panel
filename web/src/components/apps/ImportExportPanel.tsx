import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useRef, useState } from 'react'

import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { useTranslation } from '@/locales'
import { usePanelStore } from '@/store/panel'
import { cleanGroup, cleanItem, type HomelabPanelExportV1, isExportV1 } from '@/utils/exportFormat'

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

export function ImportExportPanel() {
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
            confirmText: t('settings.restoreDialogImport'),
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

                // 新增分组在响应末尾；取最新 group id
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
        <Stack spacing={2}>
            <Alert severity="info">{t('settings.backupHintTitle')}</Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                    startIcon={<CloudDownloadIcon />}
                    loading={exporting}
                    onClick={handleExport}
                >
                    {t('settings.backupBtn')}
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    loading={importing}
                    onClick={() => inputRef.current?.click()}
                >
                    {t('settings.restoreBtn')}
                </Button>
            </Stack>
            <input
                ref={inputRef}
                hidden
                type="file"
                accept="application/json,.json"
                onChange={(event) => handleFile(event.target.files?.[0])}
            />
        </Stack>
    )
}
