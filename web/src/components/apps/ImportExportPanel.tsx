import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'

import { exportBackup, importBackup } from '@/api/panel/backup'
import { getListByGroupId, addMultiple } from '@/api/panel/itemIcon'
import { edit as editGroup, getList as getGroupList } from '@/api/panel/itemIconGroup'
import { getUserConfig, setUserConfig } from '@/api/panel/userConfig'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import {
  cleanGroup,
  cleanItem,
  type HomelabPanelExportV1,
  isExportV1,
} from '@/utils/exportFormat'

function downloadJson(data: HomelabPanelExportV1) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `homelab-panel-${data.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

type FrontendBackupResult = { data: HomelabPanelExportV1 } | { data?: never, error: string }

export function ImportExportPanel() {
  const notify = useNotify()
  const confirm = useConfirm()
  const updatePanelConfigByCloud = usePanelStore(s => s.updatePanelConfigByCloud)
  const markPanelDataChanged = usePanelStore(s => s.markPanelDataChanged)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  async function buildFrontendBackup(): Promise<FrontendBackupResult> {
    const [configRes, groupRes] = await Promise.all([getUserConfig(), getGroupList()])

    if (configRes.code !== 0)
      return { error: configRes.msg }

    if (groupRes.code !== 0)
      return { error: groupRes.msg }

    const groups = await Promise.all(
      groupRes.data.list.map(async (group) => {
        if (!group.id)
          return { group, items: [] }

        const itemRes = await getListByGroupId(group.id)
        return {
          group,
          items: itemRes.code === 0 ? itemRes.data.list : [],
        }
      }),
    )

    return {
      data: {
        version: 1,
        exportedAt: new Date().toISOString(),
        panel: configRes.data.panel,
        groups,
      } satisfies HomelabPanelExportV1,
    }
  }

  async function handleExport() {
    setExporting(true)

    try {
      const backupRes = await exportBackup()

      if (backupRes.code === 0) {
        downloadJson(backupRes.data)
        notify.success('导出成功')
        return
      }

      const fallback = await buildFrontendBackup()

      if ('error' in fallback) {
        notify.error(`导出失败:${fallback.error}`)
        return
      }

      downloadJson(fallback.data)
      notify.success('导出成功')
    }
    finally {
      setExporting(false)
    }
  }

  async function importData(data: HomelabPanelExportV1) {
    const ok = await confirm({
      title: '导入配置',
      content: '导入会保存面板配置，并将备份中的分组和图标作为新数据添加。当前版本会优先使用后端事务导入，接口不可用时回退到前端顺序导入。',
      confirmText: '导入',
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    setImporting(true)

    try {
      const backendRes = await importBackup(data)

      if (backendRes.code === 0) {
        await updatePanelConfigByCloud()
        markPanelDataChanged()
        notify.success(`导入成功：${backendRes.data.groupCount} 个分组，${backendRes.data.itemCount} 个图标`)
        return
      }

      const configRes = await setUserConfig({ panel: data.panel })

      if (configRes.code !== 0) {
        notify.error(`导入面板配置失败:${configRes.msg}`)
        return
      }

      for (const entry of data.groups) {
        const groupRes = await editGroup(cleanGroup(entry.group))

        if (groupRes.code !== 0) {
          notify.error(`导入分组失败:${groupRes.msg}`)
          return
        }

        const groupId = groupRes.data.id

        if (!groupId)
          continue

        const items = entry.items.map(item => cleanItem(item, groupId))

        if (items.length) {
          const itemRes = await addMultiple(items)

          if (itemRes.code !== 0) {
            notify.error(`导入图标失败:${itemRes.msg}`)
            return
          }
        }
      }

      await updatePanelConfigByCloud()
      markPanelDataChanged()
      notify.success('导入成功')
    }
    finally {
      setImporting(false)
      if (inputRef.current)
        inputRef.current.value = ''
    }
  }

  async function handleFile(file?: File) {
    if (!file)
      return

    try {
      const data = JSON.parse(await file.text()) as unknown

      if (!isExportV1(data)) {
        notify.error('导入文件格式不正确')
        return
      }

      await importData(data)
    }
    catch {
      notify.error('导入文件解析失败')
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>导入导出</Typography>
      <Alert severity="info">
        当前导出包含面板配置、分组和图标；不包含用户、密码和文件二进制。导入会新增分组和图标，不会清空现有数据。
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button startIcon={<DownloadIcon />} loading={exporting} onClick={handleExport}>
          导出 JSON
        </Button>
        <Button variant="outlined" startIcon={<UploadFileIcon />} loading={importing} onClick={() => inputRef.current?.click()}>
          导入 JSON
        </Button>
      </Stack>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={event => handleFile(event.target.files?.[0])}
      />
    </Stack>
  )
}
