import type { HomelabPanelExportV1 } from '@/utils/exportFormat'

export interface BackupImportStats {
  groupCount: number
  itemCount: number
}

export function exportBackup() {
  return Promise.resolve({
    code: -3,
    msg: '后端暂未提供备份导出接口',
    data: null as unknown as HomelabPanelExportV1,
  })
}

export function importBackup(data: HomelabPanelExportV1) {
  return Promise.resolve({
    code: -3,
    msg: '后端暂未提供备份导入接口',
    data: {
      groupCount: data.groups.length,
      itemCount: data.groups.reduce((total, group) => total + group.items.length, 0),
    },
  })
}
