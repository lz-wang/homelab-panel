import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { type ReactNode, useEffect, useState } from 'react'

import { type AboutDep, type AboutInfo, getAbout } from '@/api/about'

// 前端运行时依赖（取自 package.json dependencies）对应的 GitHub 仓库。
// 同一仓库的多个 npm 包（如 @emotion/react 与 @emotion/styled）已合并为一条。
const frontendDeps: AboutDep[] = [
    { name: 'emotion-js/emotion', url: 'https://github.com/emotion-js/emotion' },
    { name: 'iconify/iconify-react', url: 'https://github.com/iconify/iconify-react' },
    { name: 'mui/material-ui', url: 'https://github.com/mui/material-ui' },
    { name: 'axios/axios', url: 'https://github.com/axios/axios' },
    { name: 'brix/crypto-js', url: 'https://github.com/brix/crypto-js' },
    { name: 'moment/moment', url: 'https://github.com/moment/moment' },
    { name: 'facebook/react', url: 'https://github.com/facebook/react' },
    { name: 'remix-run/react-router', url: 'https://github.com/remix-run/react-router' },
    { name: 'pmndrs/zustand', url: 'https://github.com/pmndrs/zustand' },
]

// DepLinks 把库列表渲染为逗号分隔的链接，每项点击在新标签页打开对应 GitHub 仓库。
function DepLinks({ deps }: { deps: AboutDep[] }) {
    if (deps.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                -
            </Typography>
        )
    }
    return (
        <Typography variant="body2" sx={{ lineHeight: 2 }}>
            {deps.map((dep, idx) => (
                <span key={`${dep.url}-${dep.name}`}>
                    <Link href={dep.url} target="_blank" rel="noopener noreferrer">
                        {dep.name}
                    </Link>
                    {idx < deps.length - 1 ? ', ' : ''}
                </span>
            ))}
        </Typography>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Stack spacing={0.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {label}
            </Typography>
            {children}
        </Stack>
    )
}

export function AboutPanel() {
    const [info, setInfo] = useState<AboutInfo | null>(null)

    useEffect(() => {
        let active = true
        getAbout().then((res) => {
            if (active && res.code === 0) setInfo(res.data)
        })
        return () => {
            active = false
        }
    }, [])

    return (
        <Stack spacing={3}>
            <Field label="仓库">
                <Link
                    href={info?.repo ?? 'https://github.com/lz-wang/homelab-panel'}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {info?.repo ?? 'github.com/lz-wang/homelab-panel'}
                </Link>
            </Field>

            <Field label="作者">
                <Link
                    href={info?.author?.url ?? 'https://github.com/lz-wang'}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {info?.author?.name ?? 'lz-wang'}
                </Link>
            </Field>

            <Field label="版本">
                <Typography variant="body2">{info?.version || '-'}</Typography>
            </Field>

            <Field label="前端组件">
                <DepLinks deps={frontendDeps} />
            </Field>

            <Field label="后端组件">
                <DepLinks deps={info?.backend_deps ?? []} />
            </Field>
        </Stack>
    )
}
