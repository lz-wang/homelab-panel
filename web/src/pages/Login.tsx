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

import { login } from '@/api/auth'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { useAuthStore } from '@/store/auth'
import type { LoginRequest } from '@/types/login'

export default function Login() {
  const navigate = useNavigate()
  const notify = useNotify()
  const setToken = useAuthStore(s => s.setToken)
  const setUserInfo = useAuthStore(s => s.setUserInfo)
  const [form, setForm] = useState<LoginRequest>({
    username: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)

    try {
      const res = await login(form)

      if (res.code === 0) {
        setToken(res.data.token)
        setUserInfo(res.data)
        notify.success(`Hi ${res.data.name ?? res.data.username ?? ''},${t('login.welcomeMessage')}`)
        navigate('/')
      }
      else {
        notify.error(res.msg)
      }
    }
    catch {
      notify.error('请检查网络或者服务器错误')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f2f6ff',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
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
