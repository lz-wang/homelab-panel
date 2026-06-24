import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import VisibilityIcon from '@mui/icons-material/Visibility'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import type { Theme } from '@mui/material/styles'
import { useColorScheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'

type ColorMode = 'system' | 'light' | 'dark'

const colorModeCycle: ColorMode[] = ['system', 'light', 'dark']
const colorModeLabels: Record<ColorMode, string> = {
    system: '自动',
    light: '亮色',
    dark: '暗色',
}

function floatingIconButtonSx(theme: Theme) {
    const isDark = theme.palette.mode === 'dark'

    return {
        color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(15,23,42,0.86)',
        backgroundColor: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.78)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.14)',
        boxShadow: isDark ? '0 10px 28px rgba(0,0,0,0.45)' : '0 10px 28px rgba(15,23,42,0.22)',
        backdropFilter: 'blur(14px)',
        '&:hover': {
            color: isDark ? '#FFFFFF' : theme.palette.text.primary,
            backgroundColor: isDark ? 'rgba(30,41,59,0.94)' : 'rgba(255,255,255,0.96)',
            borderColor: isDark ? 'rgba(255,255,255,0.32)' : 'rgba(15,23,42,0.24)',
            boxShadow: isDark ? '0 14px 34px rgba(0,0,0,0.55)' : '0 14px 34px rgba(15,23,42,0.28)',
        },
    }
}

interface Props {
    canManage: boolean
    browsingAsGuest: boolean
    onOpenSettings: () => void
    onLogin: () => void
    onToggleBrowseMode: () => void
    onLogout: () => void
}

export function HomeFloatingActions({
    canManage,
    browsingAsGuest,
    onOpenSettings,
    onLogin,
    onToggleBrowseMode,
    onLogout,
}: Props) {
    const { mode, setMode } = useColorScheme()
    const currentMode = (mode ?? 'system') as ColorMode

    function cycleColorMode() {
        const currentIndex = colorModeCycle.indexOf(currentMode)
        const nextMode = colorModeCycle[(currentIndex + 1) % colorModeCycle.length]

        setMode(nextMode)
    }

    return (
        <Stack
            spacing={1}
            sx={{
                position: 'fixed',
                right: 30,
                bottom: 30,
                alignItems: 'center',
                zIndex: (theme) => theme.zIndex.speedDial,
                '& .hover-action': {
                    opacity: 0,
                    pointerEvents: 'none',
                    transform: 'translateY(8px) scale(0.92)',
                    backgroundColor: (theme) => floatingIconButtonSx(theme).backgroundColor,
                    color: (theme) => floatingIconButtonSx(theme).color,
                    border: (theme) => floatingIconButtonSx(theme).border,
                    borderColor: (theme) => floatingIconButtonSx(theme).borderColor,
                    boxShadow: (theme) => floatingIconButtonSx(theme).boxShadow,
                    backdropFilter: 'blur(14px)',
                    transition:
                        'opacity 140ms ease, transform 140ms ease, background-color 140ms ease, box-shadow 140ms ease',
                    '&:hover': (theme) => floatingIconButtonSx(theme)['&:hover'],
                },
                '&:hover .hover-action, &:focus-within .hover-action': {
                    opacity: 1,
                    pointerEvents: 'auto',
                    transform: 'translateY(0) scale(1)',
                },
            }}
        >
            {canManage && (
                <>
                    <Tooltip title="设置" placement="left">
                        <IconButton className="hover-action" size="small" onClick={onOpenSettings}>
                            <SettingsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        title={browsingAsGuest ? '切换到编辑模式' : '切换到浏览模式'}
                        placement="left"
                    >
                        <IconButton
                            className="hover-action"
                            size="small"
                            onClick={onToggleBrowseMode}
                        >
                            {browsingAsGuest ? (
                                <ManageAccountsIcon fontSize="small" />
                            ) : (
                                <VisibilityIcon fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                    <Tooltip
                        title={`颜色模式：${colorModeLabels[currentMode]}，点击切换`}
                        placement="left"
                    >
                        <IconButton className="hover-action" size="small" onClick={cycleColorMode}>
                            {currentMode === 'system' && (
                                <SettingsBrightnessIcon fontSize="small" />
                            )}
                            {currentMode === 'light' && <LightModeIcon fontSize="small" />}
                            {currentMode === 'dark' && <DarkModeIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="登出" placement="left">
                        <IconButton className="hover-action" size="small" onClick={onLogout}>
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="操作" placement="left">
                        <IconButton size="small" sx={floatingIconButtonSx}>
                            <MoreVertIcon />
                        </IconButton>
                    </Tooltip>
                </>
            )}
            {!canManage && (
                <Tooltip title="登录">
                    <Fab size="small" onClick={onLogin} sx={floatingIconButtonSx}>
                        <LoginIcon />
                    </Fab>
                </Tooltip>
            )}
        </Stack>
    )
}
