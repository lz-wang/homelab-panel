import LanIcon from '@mui/icons-material/Lan'
import LoginIcon from '@mui/icons-material/Login'
import PublicIcon from '@mui/icons-material/Public'
import SettingsIcon from '@mui/icons-material/Settings'
import Fab from '@mui/material/Fab'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'

import { VisitMode } from '@/constants/auth'
import { PanelStateNetworkModeEnum } from '@/constants/panel'
import { t } from '@/locales'

interface Props {
  canManage: boolean
  visitMode: VisitMode | null
  networkMode: PanelStateNetworkModeEnum | null
  showNetworkToggle?: boolean
  onOpenSettings: () => void
  onLogin: () => void
  onChangeNetwork: (mode: PanelStateNetworkModeEnum) => void
}

export function HomeFloatingActions({
  canManage,
  visitMode,
  networkMode,
  showNetworkToggle,
  onOpenSettings,
  onLogin,
  onChangeNetwork,
}: Props) {
  return (
    <Stack spacing={1} sx={{ position: 'fixed', right: 10, bottom: 50 }}>
      {canManage && (
        <Tooltip title="设置">
          <Fab size="small" onClick={onOpenSettings}>
            <SettingsIcon />
          </Fab>
        </Tooltip>
      )}
      {!canManage && visitMode === VisitMode.VISIT_MODE_PUBLIC && (
        <Tooltip title="登录">
          <Fab size="small" onClick={onLogin}>
            <LoginIcon />
          </Fab>
        </Tooltip>
      )}
      {showNetworkToggle && (
        <Tooltip title={networkMode === PanelStateNetworkModeEnum.lan ? t('panelHome.changeToWanModel') : t('panelHome.changeToLanModel')}>
          <Fab
            size="small"
            onClick={() => {
              onChangeNetwork(
                networkMode === PanelStateNetworkModeEnum.lan
                  ? PanelStateNetworkModeEnum.wan
                  : PanelStateNetworkModeEnum.lan,
              )
            }}
          >
            {networkMode === PanelStateNetworkModeEnum.lan ? <PublicIcon /> : <LanIcon />}
          </Fab>
        </Tooltip>
      )}
    </Stack>
  )
}
