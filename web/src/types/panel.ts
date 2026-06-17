import type { PanelPanelConfigStyleEnum, PanelStateNetworkModeEnum } from '@/constants/panel'

import type { InfoBase } from './common'

export interface ItemInfo extends InfoBase {
  icon: ItemIcon | null
  title: string
  url: string
  sort?: number
  lanUrl?: string
  description?: string
  openMethod: number
  itemIconGroupId?: number
}

export interface ItemIconGroup extends InfoBase {
  icon?: string
  title?: string
  sort?: number
}

export interface ItemIcon {
  itemType: number
  src?: string
  text?: string
  backgroundColor?: string
}

export interface PanelConfig {
  backgroundImageSrc?: string
  backgroundBlur?: number
  backgroundMaskNumber?: number
  iconStyle?: PanelPanelConfigStyleEnum
  iconTextColor?: string
  iconTextInfoHideDescription?: boolean
  iconTextIconHideTitle?: boolean
  logoText?: string
  logoImageSrc?: string
  clockShowSecond?: boolean
  clockColor?: string
  searchBoxShow?: boolean
  searchBoxSearchIcon?: boolean
  marginTop?: number
  marginBottom?: number
  maxWidth?: number
  maxWidthUnit: string
  marginX?: number
  footerHtml?: string
  netModeChangeButtonShow?: boolean
}

export interface PanelState {
  rightSiderCollapsed: boolean
  leftSiderCollapsed: boolean
  networkMode: PanelStateNetworkModeEnum | null
  panelConfig: PanelConfig
}

export interface SiteFaviconRequest {
  url: string
}

export interface SiteFaviconResponse {
  iconUrl?: string
  url?: string
}

export interface FileInfo {
  id: number
  src: string
  path: string
  fileName: string
  createTime?: string
  updateTime?: string
}

export interface UploadImgResponse {
  imageUrl: string
}

export interface UploadFilesResponse {
  succMap: Record<string, string>
  errFiles: string[]
}
