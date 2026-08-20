import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'

interface Props {
    children: React.ReactNode
}

/**
 * /login 路由守卫：checking 时显示加载（避免已登录用户看到登录框闪一下再跳走），
 * 已是管理员则直接回首页，仅访客停留。
 */
export function LoginGuard({ children }: Props) {
    const status = useAuthStore((s) => s.status)

    if (status === 'checking') {
        return (
            <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
            </Box>
        )
    }

    if (status === 'admin') {
        return <Navigate to="/" replace />
    }

    return children
}
