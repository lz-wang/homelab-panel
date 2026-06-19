import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
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
import { login } from '@/api/admin'
import { useApiAction } from '@/hooks/useApiAction'
import { t } from '@/locales'
import { useAuthStore } from '@/store/auth'

export default function Login() {
    const navigate = useNavigate()
    const setToken = useAuthStore((s) => s.setToken)
    const setAdmin = useAuthStore((s) => s.setAdmin)
    const setInitialized = useAuthStore((s) => s.setInitialized)
    const [password, setPassword] = useState('')
    const { loading, run } = useApiAction()

    async function handleSubmit() {
        const res = await run(() => login(password), {
            successMessage: () => t('login.welcomeMessage'),
        })

        if (res?.code !== API_SUCCESS_CODE) return

        setToken(res.data.token)
        setAdmin(true)
        setInitialized(true)
        navigate('/')
    }

    return (
        <Box
            sx={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
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
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder={t('login.passwordPlaceholder')}
                            type="password"
                            fullWidth
                            autoFocus
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') handleSubmit()
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
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textAlign: 'center' }}
                        >
                            Powered By{' '}
                            <a
                                href="https://github.com/hslr-s/homelab-panel"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Homelab Panel
                            </a>
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    )
}
