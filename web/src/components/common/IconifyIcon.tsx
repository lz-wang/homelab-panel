import Box from '@mui/material/Box'
import { useEffect, useRef, useState } from 'react'

// Iconify 图标改走服务端本地缓存端点 /api/v1/icons/<name>：
// 首页不再请求 api.iconify.design（无公网 DNS 依赖、离线可用）。
// SVG 经 DOMParser 解析后以 DOM 节点挂载（不使用 innerHTML），
// 保留 currentColor 随父级文字色着色的语义。

const svgCache = new Map<string, SVGSVGElement>()

// 只接受纯 <svg> 根节点；解析失败（parsererror）或携带 script 一律丢弃。
function parseIconSVG(text: string): SVGSVGElement | null {
    try {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
        const root = doc.documentElement as unknown as SVGSVGElement | null

        if (!root || root.nodeName.toLowerCase() !== 'svg' || root.querySelector('script')) {
            return null
        }

        return root
    } catch {
        return null
    }
}

export function IconifyIcon({ icon, size = 35 }: { icon?: string; size?: number }) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(() =>
        icon ? (svgCache.get(icon) ?? null) : null,
    )

    useEffect(() => {
        if (!icon) return

        const cached = svgCache.get(icon)
        if (cached) {
            setSvgEl(cached)
            return
        }

        let cancelled = false

        fetch(`/api/v1/icons/${encodeURIComponent(icon)}`)
            .then((response) => (response.ok ? response.text() : null))
            .then((text) => {
                if (cancelled || !text) return

                const parsed = parseIconSVG(text)
                if (!parsed) return

                svgCache.set(icon, parsed)
                setSvgEl(parsed)
            })
            .catch(() => {
                // 获取失败保持占位，不阻塞渲染
            })

        return () => {
            cancelled = true
        }
    }, [icon])

    useEffect(() => {
        const container = containerRef.current
        if (!container || !svgEl) return

        container.replaceChildren(svgEl.cloneNode(true))
    }, [svgEl])

    if (!icon) return null

    return (
        <Box
            ref={containerRef}
            sx={{
                width: size,
                height: size,
                '& svg': { width: '100%', height: '100%', display: 'block' },
            }}
        />
    )
}
