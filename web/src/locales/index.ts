import zhCN from './zh-CN.json'

type MessageMap = Record<string, unknown>
type MessageParams = Record<string, string | number | boolean | null | undefined>

function getMessage(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((messages, name) => {
      if (typeof messages === 'object' && messages !== null)
        return (messages as MessageMap)[name]

      return undefined
    }, zhCN)

  return typeof value === 'string' ? value : key
}

export function t(key: string, params?: MessageParams): string {
  let message = getMessage(key)

  if (params) {
    Object.entries(params).forEach(([name, value]) => {
      message = message.replaceAll(`{${name}}`, String(value ?? ''))
    })
  }

  return message
}
