import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useColorScheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

export type ColorMode = 'system' | 'light' | 'dark'

const OPTIONS: { value: ColorMode; label: string; icon: ReactNode }[] = [
    { value: 'system', label: '跟随设备', icon: <SettingsBrightnessIcon /> },
    { value: 'light', label: '亮色', icon: <LightModeIcon /> },
    { value: 'dark', label: '暗色', icon: <DarkModeIcon /> },
]

export function ColorModeSelector() {
    const { mode, setMode } = useColorScheme()

    if (!mode) {
        return null
    }

    return (
        <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            aria-label="颜色模式"
            onChange={(_, value: ColorMode | null) => {
                // exclusive 模式下点击已选中的按钮会得到 null，此时重新应用被点击的值，
                // 保证颜色模式三态切换器始终有一个明确选中项。
                setMode(value ?? mode)
            }}
        >
            {OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} aria-label={opt.label}>
                    {opt.icon}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    )
}
