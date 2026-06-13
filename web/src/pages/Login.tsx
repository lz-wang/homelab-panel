import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { API_SUCCESS_CODE } from '@/api/apiResult'
import { login } from '@/api/auth'
import { VisitMode } from '@/constants/auth'
import { useApiAction } from '@/hooks/useApiAction'
import { t } from '@/locales'
import { useAuthStore } from '@/store/auth'
import type { LoginRequest } from '@/types/login'

export default function Login() {
  const navigate = useNavigate()
  const setToken = useAuthStore(s => s.setToken)
  const setUserInfo = useAuthStore(s => s.setUserInfo)
  const setVisitMode = useAuthStore(s => s.setVisitMode)
  const setInitialized = useAuthStore(s => s.setInitialized)
  const [form, setForm] = useState<LoginRequest>({
    username: '',
    password: '',
  })
  const { loading, run } = useApiAction()

  async function handleSubmit() {
    const res = await run(
      () => login(form),
      {
        successMessage: response => `Hi ${response.data.name ?? response.data.username ?? ''},${t('login.welcomeMessage')}`,
      },
    )

    if (res?.code !== API_SUCCESS_CODE)
      return

    setToken(res.data.token)
    setUserInfo(res.data)
    setVisitMode(VisitMode.VISIT_MODE_LOGIN)
    setInitialized(true)
    navigate('/')
  }

  return (
    <Box
      sx={theme => ({
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme.vars.palette.m3.surface,
        p: 2,
      })}
    >
      <Card
        sx={theme => ({
          width: '100%',
          maxWidth: 420,
          bgcolor: theme.vars.palette.m3.surfaceContainerHigh,
          borderRadius: 7,
        })}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Typography variant="h5" sx={{ textAlign: 'center', fontWeight: 700 }}>
              {t('common.appName')}
            </Typography>
            <TextField
              value={form.username}
              onChange={event => setForm({ ...form, username: event.target.value })}
              placeholder={t('login.usernamePlaceholder')}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircleOutlinedIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              value={form.password}
              onChange={event => setForm({ ...form, password: event.target.value })}
              placeholder={t('login.passwordPlaceholder')}
              type="password"
              fullWidth
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  handleSubmit()
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button fullWidth loading={loading} onClick={handleSubmit}>
              {t('login.loginButton')}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Powered By
              {' '}
              <a href="https://github.com/hslr-s/homelab-panel" target="_blank" rel="noreferrer">Homelab Panel</a>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
