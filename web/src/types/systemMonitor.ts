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
