import LogoutIcon from '@mui/icons-material/Logout'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { logout } from '@/api/auth'
import { getInfo, updateInfo, updatePassword } from '@/api/user'
import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import { useAuthStore } from '@/store/auth'

export function UserInfoPanel() {
  const notify = useNotify()
  const navigate = useNavigate()
  const userInfo = useAuthStore(s => s.userInfo)
  const setUserInfo = useAuthStore(s => s.setUserInfo)
  const removeToken = useAuthStore(s => s.removeToken)
  const [name, setName] = useState(userInfo?.name ?? '')
  const [headImage, setHeadImage] = useState(userInfo?.headImage ?? '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setName(userInfo?.name ?? '')
    setHeadImage(userInfo?.headImage ?? '')
  }, [userInfo])

  async function handleSaveInfo() {
    if (!name.trim()) {
      notify.error('昵称不能为空')
      return
    }

    setSavingInfo(true)

    try {
      const res = await updateInfo({ name: name.trim(), headImage })

      if (res.code === 0) {
        const infoRes = await getInfo()

        if (infoRes.code === 0)
          setUserInfo(infoRes.data)

        notify.success(t('common.saveSuccess'))
      }
      else {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
      }
    }
    finally {
      setSavingInfo(false)
    }
  }

  async function handleUpdatePassword() {
    if (!oldPassword || !newPassword) {
      notify.error('请填写旧密码和新密码')
      return
    }

    setSavingPassword(true)

    try {
      const res = await updatePassword({ oldPassword, newPassword })

      if (res.code === 0) {
        notify.success('密码已更新，请重新登录')
        removeToken()
        navigate('/login', { replace: true })
      }
      else {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
      }
    }
    finally {
      setSavingPassword(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)

    try {
      await logout()
    }
    finally {
      removeToken()
      setLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>用户信息</Typography>
        <Typography color="text.secondary">{userInfo?.username}</Typography>
      </Stack>

      <Box
        component="img"
        src={headImage}
        alt=""
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          objectFit: 'cover',
          bgcolor: 'action.hover',
          display: headImage ? 'block' : 'none',
        }}
      />

      <TextField
        label="昵称"
        value={name}
        onChange={event => setName(event.target.value)}
        fullWidth
      />
      <ImageUploadButton label="头像 URL" value={headImage} onChange={setHeadImage} />
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button startIcon={<SaveIcon />} loading={savingInfo} onClick={handleSaveInfo}>
          {t('common.save')}
        </Button>
      </Stack>

      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>修改密码</Typography>
        <TextField
          label="旧密码"
          type="password"
          value={oldPassword}
          onChange={event => setOldPassword(event.target.value)}
          fullWidth
        />
        <TextField
          label="新密码"
          type="password"
          value={newPassword}
          onChange={event => setNewPassword(event.target.value)}
          fullWidth
        />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Button color="error" variant="outlined" startIcon={<LogoutIcon />} loading={loggingOut} onClick={handleLogout}>
            退出登录
          </Button>
          <Button loading={savingPassword} onClick={handleUpdatePassword}>
            更新密码
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}
