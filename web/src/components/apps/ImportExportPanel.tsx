import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useRef, useState } from 'react'

import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import { cleanGroup, cleanItem, type HomelabPanelExportV1, isExportV1 } from '@/utils/exportFormat'

function downloadJson(data: HomelabPanelExportV1) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `homelab-panel-${data.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
}

type FrontendBackupResult = { data: HomelabPanelExportV1 } | { data?: never; error: string }

export function ImportExportPanel() {
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
            confirmText: '导入',
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

                // 新增分组在响应末尾；取最新 group id
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
        <Stack spacing={2}>
            <Alert severity="info">
                当前备份包含面板配置、分组和图标；不包含用户、密码和文件。恢复会新增分组和图标，不会清空现有数据。
            </Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                    startIcon={<CloudDownloadIcon />}
                    loading={exporting}
                    onClick={handleExport}
                >
                    备份
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    loading={importing}
                    onClick={() => inputRef.current?.click()}
                >
                    恢复
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
