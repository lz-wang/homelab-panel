import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined'
import CableIcon from '@mui/icons-material/Cable'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import TableViewIcon from '@mui/icons-material/TableView'
import TuneIcon from '@mui/icons-material/Tune'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import { type ComponentType, lazy, Suspense, useEffect, useState } from 'react'

import { useTranslation } from '@/locales'

// 设置各面板按需加载：默认页（页面设置）随 AppStarter 一起 preload，
// 其余面板在切换 Tab 时才拉取对应 chunk。
const panelLoaders = {
    pageSettings: () => import('./PageSettingsPanel'),
    appSettings: () => import('./AppSettingsPanel'),
    groups: () => import('./GroupManager'),
    files: () => import('@/features/files/FileManagerPanel'),
    mcp: () => import('./MCPSettingsPanel'),
    misc: () => import('./MiscSettingsPanel'),
    about: () => import('./AboutPanel'),
} as const

type SettingsPanelKey = keyof typeof panelLoaders

const PageSettingsPanel = lazy(() =>
    panelLoaders.pageSettings().then((m) => ({ default: m.PageSettingsPanel })),
)
const AppSettingsPanel = lazy(() =>
    panelLoaders.appSettings().then((m) => ({ default: m.AppSettingsPanel })),
)
const GroupManager = lazy(() => panelLoaders.groups().then((m) => ({ default: m.GroupManager })))
const FileManagerPanel = lazy(() =>
    panelLoaders.files().then((m) => ({ default: m.FileManagerPanel })),
)
const MCPSettingsPanel = lazy(() =>
    panelLoaders.mcp().then((m) => ({ default: m.MCPSettingsPanel })),
)
const MiscSettingsPanel = lazy(() =>
    panelLoaders.misc().then((m) => ({ default: m.MiscSettingsPanel })),
)
const AboutPanel = lazy(() => panelLoaders.about().then((m) => ({ default: m.AboutPanel })))

/** 提前拉取指定设置面板的 chunk；idle preload 与 Tab hover/focus 共用。 */
export function preloadSettingsPanel(key: SettingsPanelKey) {
    void panelLoaders[key]()
}

const apps: Array<{
    key: SettingsPanelKey
    nameKey: string
    icon: React.ReactNode
    component: ComponentType
}> = [
    {
        key: 'pageSettings',
        nameKey: 'settings.tabPage',
        icon: <PaletteOutlinedIcon />,
        component: PageSettingsPanel,
    },
    {
        key: 'appSettings',
        nameKey: 'settings.tabApp',
        icon: <AppsOutlinedIcon />,
        component: AppSettingsPanel,
    },
    {
        key: 'groups',
        nameKey: 'settings.tabGroups',
        icon: <TableViewIcon />,
        component: GroupManager,
    },
    {
        key: 'files',
        nameKey: 'settings.tabFiles',
        icon: <FolderOutlinedIcon />,
        component: FileManagerPanel,
    },
    { key: 'mcp', nameKey: 'settings.tabMcp', icon: <CableIcon />, component: MCPSettingsPanel },
    { key: 'misc', nameKey: 'settings.tabMisc', icon: <TuneIcon />, component: MiscSettingsPanel },
    {
        key: 'about',
        nameKey: 'settings.tabAbout',
        icon: <InfoOutlinedIcon />,
        component: AboutPanel,
    },
]

function PanelSuspenseFallback() {
    return (
        <Stack sx={{ alignItems: 'center', py: 10 }}>
            <CircularProgress size={32} />
        </Stack>
    )
}

interface Props {
    open: boolean
    onClose: () => void
}

export function AppStarter({ open, onClose }: Props) {
    const { t } = useTranslation()
    const [activeKey, setActiveKey] = useState<SettingsPanelKey>(apps[0].key)
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
            <DialogTitle>{t('settings.dialogTitle')}</DialogTitle>
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
                            // hover/focus 即预取对应面板 chunk，点击 Tab 时基本零等待。
                            onPointerEnter={() => preloadSettingsPanel(app.key)}
                            onFocus={() => preloadSettingsPanel(app.key)}
                            sx={{
                                borderRadius: 2,
                                mx: 1,
                                my: 0.5,
                                '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                            }}
                        >
                            <ListItemIcon>{app.icon}</ListItemIcon>
                            <ListItemText primary={t(app.nameKey)} />
                        </ListItemButton>
                    ))}
                </List>
                <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                    <Suspense fallback={<PanelSuspenseFallback />}>
                        <ActiveComponent />
                    </Suspense>
                </Box>
            </Stack>
        </Dialog>
    )
}
