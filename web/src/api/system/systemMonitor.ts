import { post } from '@/api/request'
import type { SystemMonitorSnapshot } from '@/types/systemMonitor'

export function getSystemMonitorSnapshot() {
  return post<SystemMonitorSnapshot>({
    url: '/system/monitor/getAll',
  })
}

export function getDiskMountpoints() {
  return post<string[]>({
    url: '/system/monitor/getDiskMountpoints',
  })
}
