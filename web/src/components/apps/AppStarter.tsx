import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
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
import { useEffect, useMemo, useState } from 'react'

import { StylePanel } from '@/components/apps/StylePanel'
import { GroupManager } from '@/components/apps/GroupManager'
import { ImportExportPanel } from '@/components/apps/ImportExportPanel'
import { SystemMonitorSettingsPanel } from '@/components/apps/SystemMonitorSettingsPanel'
import { UserInfoPanel } from '@/components/apps/UserInfoPanel'
import { UsersPanel } from '@/components/apps/UsersPanel'
import { FileManagerPanel } from '@/features/files/FileManagerPanel'
import { useAuthStore } from '@/store/auth'

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
  return <ImportExportPanel />
}

function Files() {
  return <FileManagerPanel />
}

function SystemMonitorSettings() {
  return <SystemMonitorSettingsPanel />
}

const apps = [
  { key: 'userInfo', name: '用户信息', icon: <PersonOutlineOutlinedIcon />, component: UserInfo },
  { key: 'style', name: '样式设置', icon: <PaletteOutlinedIcon />, component: Style },
  { key: 'groups', name: '分组管理', icon: <FolderOutlinedIcon />, component: Groups },
  { key: 'files', name: '文件管理', icon: <FolderOutlinedIcon />, component: Files },
  { key: 'systemMonitor', name: '系统监控', icon: <MonitorHeartOutlinedIcon />, component: SystemMonitorSettings },
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: theme => ({
            overflow: 'hidden',
            bgcolor: theme.vars.palette.m3.surfaceContainerHigh,
          }),
        },
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2.5, fontWeight: 700 }}>设置</DialogTitle>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ minHeight: 520 }}>
        <List
          sx={theme => ({
            width: { xs: '100%', sm: 220 },
            display: { xs: 'flex', sm: 'block' },
            gap: { xs: 0.5, sm: 0 },
            overflowX: { xs: 'auto', sm: 'visible' },
            px: { xs: 1, sm: 0 },
            pb: { xs: 1, sm: 0 },
            borderRight: { sm: 1 },
            borderBottom: { xs: 1, sm: 0 },
            borderColor: theme.vars.palette.m3.outlineVariant,
            bgcolor: theme.vars.palette.m3.surfaceContainer,
          })}
        >
          {visibleApps.map(app => (
            <ListItemButton
              key={app.key}
              selected={app.key === activeKey}
              onClick={() => setActiveKey(app.key)}
              sx={{ flexShrink: 0 }}
            >
              <ListItemIcon>{app.icon}</ListItemIcon>
              <ListItemText primary={app.name} />
            </ListItemButton>
          ))}
        </List>
        <Box
          sx={theme => ({
            flex: 1,
            p: 3,
            overflow: 'auto',
            bgcolor: theme.vars.palette.m3.surfaceContainerLow,
          })}
        >
          <ActiveComponent />
        </Box>
      </Stack>
    </Dialog>
  )
}
