export interface CPUInfo {
  coreCount: number
  cpuNum: number
  model: string
  usages: number[]
}

export interface DiskInfo {
  mountpoint: string
  total: number
  used: number
  free: number
  usedPercent: number
}

export interface NetIOCountersInfo {
  bytesSent: number
  bytesRecv: number
  name: string
}

export interface MemoryInfo {
  total: number
  used: number
  free: number
  usedPercent: number
}

export interface SystemMonitorSnapshot {
  cpuInfo: CPUInfo
  diskInfo: DiskInfo[]
  netIOCountersInfo: NetIOCountersInfo[]
  memoryInfo: MemoryInfo
}

export interface SystemMonitorConfig {
  enabled: boolean
  showTitle: boolean
  publicVisible: boolean
  refreshIntervalSeconds: number
  showCpu: boolean
  showMemory: boolean
  showDisk: boolean
  diskMountpoint?: string
}

export const systemMonitorConfigName = 'systemMonitor'

export function defaultSystemMonitorConfig(): SystemMonitorConfig {
  return {
    enabled: true,
    showTitle: true,
    publicVisible: false,
    refreshIntervalSeconds: 10,
    showCpu: true,
    showMemory: true,
    showDisk: true,
    diskMountpoint: '',
  }
}
