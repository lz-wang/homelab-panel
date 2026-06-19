import LoginIcon from '@mui/icons-material/Login'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Fab from '@mui/material/Fab'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'

interface Props {
    canManage: boolean
    onOpenSettings: () => void
    onLogin: () => void
}

export function HomeFloatingActions({ canManage, onOpenSettings, onLogin }: Props) {
    return (
        <Stack spacing={1} sx={{ position: 'fixed', right: 30, bottom: 30 }}>
            {canManage && (
                <Tooltip title="设置">
                    <IconButton
                        size="small"
                        onClick={onOpenSettings}
                        sx={{
                            color: 'text.disabled',
                            '&:hover': {
                                backgroundColor: 'common.white',
                                color: 'text.primary',
                            },
                        }}
                    >
                        <MoreVertIcon />
                    </IconButton>
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
