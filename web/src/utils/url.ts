const allowedUrlProtocols = new Set(['http:', 'https:'])
const urlSchemePattern = /^[a-z][a-z\d+.-]*:/i

export function normalizeUrl(value?: string) {
    const trimmed = value?.trim() ?? ''

    if (!trimmed) return ''

    if (urlSchemePattern.test(trimmed)) return trimmed

    return `https://${trimmed}`
}

export function isValidUrl(value: string) {
    if (!URL.canParse(value)) return false

    return allowedUrlProtocols.has(new URL(value).protocol)
}

export function titleFromUrl(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch {
        return url
    }
}
