import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import {
  create,
  deletes,
  getList,
  getPublicVisitUser,
  setPublicVisitUser,
  update,
} from '@/api/panel/users'
import { useConfirm } from '@/components/common/ConfirmProvider'
import { useNotify } from '@/components/common/NotifyProvider'
import { t } from '@/locales'
import type { SaveUserRequest, UserInfo } from '@/types/user'

const defaultUser: SaveUserRequest = {
  username: '',
  name: '',
  password: '',
  role: 2,
}

export function UsersPanel() {
  const notify = useNotify()
  const confirm = useConfirm()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(10)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<SaveUserRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const [publicUserId, setPublicUserId] = useState<number | ''>('')
  const [savingPublicUser, setSavingPublicUser] = useState(false)

  async function loadUsers() {
    setLoading(true)

    try {
      const res = await getList({ page: page + 1, limit, keyword: keyword.trim() })

      if (res.code === 0) {
        setUsers(res.data.list)
        setCount(res.data.count)
      }
      else {
        notify.error(res.msg)
      }
    }
    finally {
      setLoading(false)
    }
  }

  async function loadPublicUser() {
    const res = await getPublicVisitUser()

    if (res.code === 0 && res.data.id)
      setPublicUserId(res.data.id)
    else
      setPublicUserId('')
  }

  useEffect(() => {
    loadUsers()
  }, [page, limit])

  useEffect(() => {
    loadPublicUser()
  }, [])

function openEdit(user?: UserInfo) {
    const role = user?.role === 'admin' || user?.role === 1 ? 1 : 2

    setEditing({
      ...defaultUser,
      ...user,
      username: user?.username ?? '',
      name: user?.name ?? '',
      password: '',
      role,
    })
  }

  async function handleSaveUser() {
    if (!editing)
      return

    if (!editing.username.trim() || !editing.name.trim()) {
      notify.error('账号和昵称不能为空')
      return
    }

    if (!editing.id && !editing.password) {
      notify.error('新用户必须填写密码')
      return
    }

    setSaving(true)

    try {
      const res = editing.id ? await update(editing) : await create(editing)

      if (res.code === 0) {
        notify.success(t('common.saveSuccess'))
        setEditing(null)
        loadUsers()
      }
      else {
        notify.error(`${t('common.saveFail')}:${res.msg}`)
      }
    }
    finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(user: UserInfo) {
    if (!user.id)
      return

    const ok = await confirm({
      title: t('common.delete'),
      content: t('common.deleteConfirmByName', { name: user.name ?? user.username ?? String(user.id) }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
    })

    if (!ok)
      return

    const res = await deletes([user.id])

    if (res.code === 0) {
      notify.success(t('common.deleteSuccess'))
      loadUsers()
    }
    else {
      notify.error(`${t('common.deleteFail')}:${res.msg}`)
    }
  }

  async function handleSavePublicUser() {
    setSavingPublicUser(true)

    try {
      const res = await setPublicVisitUser({ userId: publicUserId === '' ? null : publicUserId })

      if (res.code === 0)
        notify.success(t('common.saveSuccess'))
      else
        notify.error(`${t('common.saveFail')}:${res.msg}`)
    }
    finally {
      setSavingPublicUser(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>用户管理</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            size="small"
            placeholder="搜索用户"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setPage(0)
                loadUsers()
              }
            }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              setPage(0)
              loadUsers()
            }}
          >
            搜索
          </Button>
          <Button startIcon={<AddIcon />} onClick={() => openEdit()}>{t('common.add')}</Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>公开访问用户</InputLabel>
          <Select
            label="公开访问用户"
            value={publicUserId}
            onChange={(event) => {
              const value = event.target.value as string | number
              setPublicUserId(value === '' ? '' : Number(value))
            }}
          >
            <MenuItem value="">未设置</MenuItem>
            {users.map(user => (
              <MenuItem key={user.id} value={user.id}>{user.name ?? user.username}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button loading={savingPublicUser} onClick={handleSavePublicUser}>保存公开用户</Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>账号</TableCell>
            <TableCell>昵称</TableCell>
            <TableCell>角色</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.role === 1 ? '管理员' : '用户'}</TableCell>
              <TableCell align="right">
                <Tooltip title={t('common.edit')}>
                  <IconButton onClick={() => openEdit(user)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('common.delete')}>
                  <IconButton onClick={() => handleDeleteUser(user)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={count}
        page={page}
        rowsPerPage={limit}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页"
        onPageChange={(_, nextPage) => setPage(nextPage)}
        onRowsPerPageChange={(event) => {
          setLimit(Number(event.target.value))
          setPage(0)
        }}
      />

      {!loading && users.length === 0 && (
        <Typography color="text.secondary">暂无用户</Typography>
      )}

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? t('common.edit') : t('common.add')}</DialogTitle>
        {editing && (
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="账号"
                value={editing.username}
                onChange={event => setEditing({ ...editing, username: event.target.value })}
                fullWidth
              />
              <TextField
                label="昵称"
                value={editing.name}
                onChange={event => setEditing({ ...editing, name: event.target.value })}
                fullWidth
              />
              <TextField
                label={editing.id ? '新密码（留空不修改）' : '密码'}
                type="password"
                value={editing.password ?? ''}
                onChange={event => setEditing({ ...editing, password: event.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>角色</InputLabel>
                <Select
                  label="角色"
                  value={editing.role}
                  onChange={event => setEditing({ ...editing, role: Number(event.target.value) })}
                >
                  <MenuItem value={1}>管理员</MenuItem>
                  <MenuItem value={2}>用户</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button variant="text" disabled={saving} onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
          <Button loading={saving} onClick={handleSaveUser}>{t('common.confirm')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
