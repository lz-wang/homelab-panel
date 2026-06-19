type JsonObject = Record<string, unknown>

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, ch => `_${ch.toLowerCase()}`)
}

function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())
}

function convertKeys(value: unknown, toSnake: boolean): unknown {
  if (Array.isArray(value))
    return value.map(item => convertKeys(item, toSnake))
  if (isPlainObject(value)) {
    const result: JsonObject = {}
    for (const [key, val] of Object.entries(value))
      result[toSnake ? toSnakeKey(key) : toCamelKey(key)] = convertKeys(val, toSnake)
    return result
  }
  return value
}

export function keysToSnake<T>(value: T): unknown {
  return convertKeys(value, true)
}

export function keysToCamel<T>(value: T): unknown {
  return convertKeys(value, false)
}
