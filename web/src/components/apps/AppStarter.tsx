import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import { useEffect, useState } from 'react'

import { GroupManager } from '@/components/apps/GroupManager'
import { ImportExportPanel } from '@/components/apps/ImportExportPanel'
import { StylePanel } from '@/components/apps/StylePanel'
import { FileManagerPanel } from '@/features/files/FileManagerPanel'

function Style() {
  return <StylePanel />
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

const apps = [
  { key: 'style', name: '样式设置', icon: <PaletteOutlinedIcon />, component: Style },
  { key: 'groups', name: '分组管理', icon: <FolderOutlinedIcon />, component: Groups },
  { key: 'files', name: '文件管理', icon: <FolderOutlinedIcon />, component: Files },
  { key: 'importExport', name: '导入导出', icon: <BackupOutlinedIcon />, component: ImportExport },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function AppStarter({ open, onClose }: Props) {
  const [activeKey, setActiveKey] = useState(apps[0].key)
  const active = apps.find(item => item.key === activeKey) ?? apps[0]
  const ActiveComponent = active.component

  useEffect(() => {
    if (!apps.some(app => app.key === activeKey))
      setActiveKey(apps[0].key)
  }, [activeKey])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>设置</DialogTitle>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ minHeight: 520 }}>
        <List sx={{ width: { xs: '100%', sm: 220 }, borderRight: { sm: 1 }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider' }}>
          {apps.map(app => (
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
