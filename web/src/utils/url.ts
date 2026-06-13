export function normalizeUrl(value?: string) {
  const trimmed = value?.trim() ?? ''

  if (!trimmed)
    return ''

  if (/^https?:\/\//i.test(trimmed))
    return trimmed

  return `https://${trimmed}`
}

export function isValidUrl(value: string) {
  return URL.canParse(value)
}

export function titleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  }
  catch {
    return url
  }
}
