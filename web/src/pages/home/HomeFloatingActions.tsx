import LoginIcon from '@mui/icons-material/Login'
import SettingsIcon from '@mui/icons-material/Settings'
import Fab from '@mui/material/Fab'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'

interface Props {
    canManage: boolean
    onOpenSettings: () => void
    onLogin: () => void
}

export function HomeFloatingActions({ canManage, onOpenSettings, onLogin }: Props) {
    return (
        <Stack spacing={1} sx={{ position: 'fixed', right: 10, bottom: 50 }}>
            {canManage && (
                <Tooltip title="设置">
                    <Fab size="small" onClick={onOpenSettings}>
                        <SettingsIcon />
                    </Fab>
                </Tooltip>
            )}
            {!canManage && (
                <Tooltip title="登录">
                    <Fab size="small" onClick={onLogin}>
                        <LoginIcon />
                    </Fab>
                </Tooltip>
            )}
        </Stack>
    )
}
