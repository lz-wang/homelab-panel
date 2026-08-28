import Box from '@mui/material/Box'
import { useEffect, useRef, useState } from 'react'

// Iconify 图标改走服务端本地缓存端点 /api/v1/icons/<name>：
// 首页不再请求 api.iconify.design（无公网 DNS 依赖、离线可用）。
// SVG 经 DOMParser 解析后以 DOM 节点挂载（不使用 innerHTML），
// 保留 currentColor 随父级文字色着色的语义。

// 解析结果缓存：成功后永久复用，同名图标不再发起请求。
const svgCache = new Map<string, SVGSVGElement>()

// 在途请求去重：同名图标并发渲染（首页同图标多实例）只发起一次请求；
// 某个组件 unmount 只阻止其后续 setState，不中断共享请求。
const inflightCache = new Map<string, Promise<SVGSVGElement | null>>()

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

function loadIconSVG(icon: string): Promise<SVGSVGElement | null> {
    const cached = svgCache.get(icon)
    if (cached) return Promise.resolve(cached)

    const inflight = inflightCache.get(icon)
    if (inflight) return inflight

    const request = fetch(`/api/v1/icons/${encodeURIComponent(icon)}`)
        .then((response) => (response.ok ? response.text() : null))
        .then((text) => {
            const parsed = text ? parseIconSVG(text) : null
            if (parsed) svgCache.set(icon, parsed)
            return parsed
        })
        .catch(() => null)
        .finally(() => {
            // 失败不缓存，下次挂载可重试。
            inflightCache.delete(icon)
        })

    inflightCache.set(icon, request)
    return request
}

export function IconifyIcon({ icon, size = 35 }: { icon?: string; size?: number }) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(() =>
        icon ? (svgCache.get(icon) ?? null) : null,
    )

    useEffect(() => {
        if (!icon) return

        if (svgCache.has(icon)) {
            setSvgEl(svgCache.get(icon) ?? null)
            return
        }

        let cancelled = false

        void loadIconSVG(icon).then((el) => {
            if (!cancelled && el) setSvgEl(el)
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
