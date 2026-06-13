import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { VisitMode } from '@/constants/auth'
import { useAuthStore } from '@/store/auth'

interface Props {
  children: React.ReactNode
}

export function AuthBootstrap({ children }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const initialized = useAuthStore(s => s.initialized)
  const visitMode = useAuthStore(s => s.visitMode)
  const isLoggedIn = useAuthStore(s => s.isLoggedIn)
  const bootstrapAuth = useAuthStore(s => s.bootstrapAuth)

  useEffect(() => {
    bootstrapAuth()
  }, [bootstrapAuth])

  useEffect(() => {
    if (!initialized)
      return

    if (location.pathname === '/login' && isLoggedIn()) {
      navigate('/', { replace: true })
      return
    }

    if (location.pathname !== '/login' && !isLoggedIn() && visitMode === VisitMode.VISIT_MODE_LOGIN)
      navigate('/login', { replace: true })
  }, [initialized, isLoggedIn, location.pathname, navigate, visitMode])

  if (!initialized) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  return children
}
