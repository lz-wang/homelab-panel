import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import CableIcon from '@mui/icons-material/Cable'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import ImportExportIcon from '@mui/icons-material/ImportExport'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import TableViewIcon from '@mui/icons-material/TableView'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import { useEffect, useState } from 'react'

import { AboutPanel } from '@/components/apps/AboutPanel'
import { GroupManager } from '@/components/apps/GroupManager'
import { ImportExportPanel } from '@/components/apps/ImportExportPanel'
import { MCPSettingsPanel } from '@/components/apps/MCPSettingsPanel'
import { AppSettingsPanel, PageSettingsPanel } from '@/components/apps/SettingsPanels'
import { FileManagerPanel } from '@/features/files/FileManagerPanel'

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
    {
        key: 'pageSettings',
        name: '页面设置',
        icon: <PaletteOutlinedIcon />,
        component: PageSettingsPanel,
    },
    {
        key: 'appSettings',
        name: '应用设置',
        icon: <AppsOutlinedIcon />,
        component: AppSettingsPanel,
    },
    { key: 'groups', name: '分组管理', icon: <TableViewIcon />, component: Groups },
    { key: 'files', name: '文件管理', icon: <FolderOutlinedIcon />, component: Files },
    {
        key: 'importExport',
        name: '导入导出',
        icon: <ImportExportIcon />,
        component: ImportExport,
    },
    { key: 'mcp', name: 'MCP设置', icon: <CableIcon />, component: MCPSettingsPanel },
    { key: 'about', name: '关于', icon: <InfoOutlinedIcon />, component: AboutPanel },
]

interface Props {
    open: boolean
    onClose: () => void
}

export function AppStarter({ open, onClose }: Props) {
    const [activeKey, setActiveKey] = useState(apps[0].key)
    const active = apps.find((item) => item.key === activeKey) ?? apps[0]
    const ActiveComponent = active.component

    useEffect(() => {
        if (!apps.some((app) => app.key === activeKey)) setActiveKey(apps[0].key)
    }, [activeKey])

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        height: { sm: '80vh' },
                        maxHeight: { sm: '80vh' },
                        borderRadius: 2,
                    },
                },
            }}
        >
            <DialogTitle>设置</DialogTitle>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ flex: 1, minHeight: { xs: 520, sm: 0 } }}
            >
                <List
                    sx={{
                        width: { xs: '100%', sm: 220 },
                        borderRight: { sm: 1 },
                        borderBottom: { xs: 1, sm: 0 },
                        borderColor: (theme) => alpha(theme.palette.divider, 0.5),
                        overflow: 'auto',
                    }}
                >
                    {apps.map((app) => (
                        <ListItemButton
                            key={app.key}
                            selected={app.key === activeKey}
                            onClick={() => setActiveKey(app.key)}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                my: 0.5,
                                '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                            }}
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
