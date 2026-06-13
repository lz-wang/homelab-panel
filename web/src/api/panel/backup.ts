import { post } from '@/api/request'
import type { HomelabPanelExportV1 } from '@/utils/exportFormat'

export interface BackupImportStats {
  groupCount: number
  itemCount: number
}

export function exportBackup() {
  return post<HomelabPanelExportV1>({
    url: '/panel/backup/export',
  })
}

export function importBackup(data: HomelabPanelExportV1) {
  return post<BackupImportStats>({
    url: '/panel/backup/import',
    data,
  })
}
