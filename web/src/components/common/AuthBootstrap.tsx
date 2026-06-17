import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/auth'

interface Props {
  children: React.ReactNode
}

export function AuthBootstrap({ children }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const initialized = useAuthStore(s => s.initialized)
  const isAdmin = useAuthStore(s => s.isAdmin)
  const bootstrapAuth = useAuthStore(s => s.bootstrapAuth)

  useEffect(() => {
    bootstrapAuth()
  }, [bootstrapAuth])

  useEffect(() => {
    if (!initialized)
      return

    // 已登录用户在 /login 页则跳回首页；未登录用户允许留在任意页（始终公开）
    if (location.pathname === '/login' && isAdmin)
      navigate('/', { replace: true })
  }, [initialized, isAdmin, location.pathname, navigate])

  if (!initialized) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return children
}
