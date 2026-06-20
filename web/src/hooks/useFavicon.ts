import { useEffect } from 'react'

import { usePanelStore } from '@/store/panel'

const DEFAULT_FAVICON = '/favicon.svg'

function faviconTypeFor(href: string): string {
    if (href.endsWith('.svg')) return 'image/svg+xml'
    if (href.endsWith('.png')) return 'image/png'
    if (href.endsWith('.ico')) return 'image/x-icon'
    return ''
}

/**
 * Keep <link rel="icon"> in sync with panelConfig.faviconSrc.
 *
 * - empty/undefined → default /favicon.svg
 * - /uploads/ path  → set href, then probe existence; on a definitive 404
 *                     (file deleted from the file manager) clear + persist
 *                     faviconSrc and revert to the default.
 * - https://...     → set href directly (no probe; external reachability is
 *                     the user's responsibility)
 */
export function useFavicon() {
    const faviconSrc = usePanelStore((s) => s.panelConfig.faviconSrc)

    useEffect(() => {
        const link = document.querySelector<HTMLLinkElement>("link[rel='icon']")
        if (!link) return

        const custom = faviconSrc?.trim()
        const href = custom ? custom : DEFAULT_FAVICON
        link.href = href

        const type = faviconTypeFor(href)
        if (type) link.type = type
        else link.removeAttribute('type')

        if (!custom || !custom.startsWith('/uploads/')) return

        let cancelled = false
        // cache: 'no-cache' so a file deleted after first load is actually seen as 404
        fetch(custom, { method: 'GET', cache: 'no-cache' })
            .then((res) => {
                if (cancelled) return
                if (res.status === 404) {
                    const store = usePanelStore.getState()
                    store.setPanelConfig({ ...store.panelConfig, faviconSrc: undefined })
                }
            })
            .catch(() => {
                // transient network failure — leave the favicon as-is
            })

        return () => {
            cancelled = true
        }
    }, [faviconSrc])
}
