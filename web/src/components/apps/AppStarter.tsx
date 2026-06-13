import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useMemo, useState } from 'react'

import { StylePanel } from '@/components/apps/StylePanel'
import { GroupManager } from '@/components/apps/GroupManager'
import { UserInfoPanel } from '@/components/apps/UserInfoPanel'
import { UsersPanel } from '@/components/apps/UsersPanel'
import { useAuthStore } from '@/store/auth'

function PanelPlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Stack spacing={1}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">
        {description}
      </Typography>
    </Stack>
  )
}

function UserInfo() {
  return <UserInfoPanel />
}

function Style() {
  return <StylePanel />
}

function Users() {
  return <UsersPanel />
}

function Groups() {
  return <GroupManager />
}

function ImportExport() {
  return <PanelPlaceholder title="导入导出" description="备份恢复入口已保留，后续可继续迁移 JSON 导入导出流程。" />
}

const apps = [
  { key: 'userInfo', name: '用户信息', icon: <PersonOutlineOutlinedIcon />, component: UserInfo },
  { key: 'style', name: '样式设置', icon: <PaletteOutlinedIcon />, component: Style },
  { key: 'groups', name: '分组管理', icon: <FolderOutlinedIcon />, component: Groups },
  { key: 'users', name: '用户管理', icon: <PeopleAltOutlinedIcon />, component: Users },
  { key: 'importExport', name: '导入导出', icon: <BackupOutlinedIcon />, component: ImportExport },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function AppStarter({ open, onClose }: Props) {
  const isAdmin = useAuthStore(s => s.isAdmin)
  const visibleApps = useMemo(() => apps.filter(app => app.key !== 'users' || isAdmin()), [isAdmin])
  const [activeKey, setActiveKey] = useState(apps[0].key)
  const active = visibleApps.find(item => item.key === activeKey) ?? visibleApps[0]
  const ActiveComponent = active.component

  useEffect(() => {
    if (!visibleApps.some(app => app.key === activeKey))
      setActiveKey(visibleApps[0].key)
  }, [activeKey, visibleApps])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>设置</DialogTitle>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ minHeight: 520 }}>
        <List sx={{ width: { xs: '100%', sm: 220 }, borderRight: { sm: 1 }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider' }}>
          {visibleApps.map(app => (
            <ListItemButton
              key={app.key}
              selected={app.key === activeKey}
              onClick={() => setActiveKey(app.key)}
            >
              <ListItemIcon>{app.icon}</ListItemIcon>
              <ListItemText primary={app.name} />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <ActiveComponent />
        </Box>
      </Stack>
    </Dialog>
  )
}
