import type { App } from 'vue'
import zhCN from './zh-CN.json'

type MessageMap = Record<string, any>
type MessageParams = Record<string, any>

function getMessage(key: string): string {
  const value = key.split('.').reduce<any>((messages, name) => messages?.[name], zhCN as MessageMap)
  return typeof value === 'string' ? value : key
}

export function t(key: string, params?: MessageParams): string {
  let message = getMessage(key)
  if (params) {
    Object.entries(params).forEach(([name, value]) => {
      message = message.replaceAll(`{${name}}`, String(value))
    })
  }
  return message
}

export function setupI18n(app: App) {
  app.config.globalProperties.$t = t
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $t: typeof t
  }
}
