import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'

import { getListByGroupId, addMultiple } from '@/api/panel/itemIcon'
import { edit as editGroup, getList as getGroupList } from '@/api/panel/itemIconGroup'
import { getUserConfig, setUserConfig } from '@/api/panel/userConfig'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { usePanelStore } from '@/store/panel'
import type { ItemIconGroup, ItemInfo, PanelConfig } from '@/types/panel'

interface HomelabPanelExportV1 {
  version: 1
  exportedAt: string
  panel: PanelConfig
  groups: Array<{
    group: ItemIconGroup
    items: ItemInfo[]
  }>
}

function cleanGroup(group: ItemIconGroup): ItemIconGroup {
  return {
    icon: group.icon,
    title: group.title,
    sort: group.sort,
  }
}

function cleanItem(item: ItemInfo, itemIconGroupId: number): ItemInfo {
  return {
    icon: item.icon,
    title: item.title,
    url: item.url,
    lanUrl: item.lanUrl,
    description: item.description,
    openMethod: item.openMethod,
    sort: item.sort,
    itemIconGroupId,
  }
}

function isExportV1(value: unknown): value is HomelabPanelExportV1 {
  if (!value || typeof value !== 'object')
    return false

  const data = value as Partial<HomelabPanelExportV1>

  return data.version === 1
    && Boolean(data.panel)
    && Array.isArray(data.groups)
    && data.groups.every(group => Boolean(group.group) && Array.isArray(group.items))
}

function downloadJson(data: HomelabPanelExportV1) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `homelab-panel-${data.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportExportPanel() {
  const notify = useNotify()
  const confirm = useConfirm()
  const updatePanelConfigByCloud = usePanelStore(s => s.updatePanelConfigByCloud)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleExport() {
    setExporting(true)

    try {
      const [configRes, groupRes] = await Promise.all([getUserConfig(), getGroupList()])

      if (configRes.code !== 0) {
        notify.error(`导出失败:${configRes.msg}`)
        return
      }

      if (groupRes.code !== 0) {
        notify.error(`导出失败:${groupRes.msg}`)
        return
      }

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

      downloadJson({
        version: 1,
        exportedAt: new Date().toISOString(),
        panel: configRes.data.panel,
        groups,
      })
      notify.success('导出成功')
    }
    finally {
      setExporting(false)
    }
  }

  async function importData(data: HomelabPanelExportV1) {
    const ok = await confirm({
      title: '导入配置',
      content: '导入会保存面板配置，并将备份中的分组和图标作为新数据添加。后端当前没有事务导入接口，中途失败可能出现部分成功。',
      confirmText: '导入',
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    setImporting(true)

    try {
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
