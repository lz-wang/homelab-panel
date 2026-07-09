import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import { useColorScheme } from '@mui/material/styles'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import type { ReactNode } from 'react'

import { useTranslation } from '@/locales'

export type ColorMode = 'system' | 'light' | 'dark'

export function ColorModeSelector() {
    const { mode, setMode } = useColorScheme()
    const { t } = useTranslation()

    const options: { value: ColorMode; label: string; icon: ReactNode }[] = [
        { value: 'system', label: t('colorMode.system'), icon: <SettingsBrightnessIcon /> },
        { value: 'light', label: t('colorMode.light'), icon: <LightModeIcon /> },
        { value: 'dark', label: t('colorMode.dark'), icon: <DarkModeIcon /> },
    ]

    if (!mode) {
        return null
    }

    return (
        <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            aria-label={t('colorMode.aria')}
            onChange={(_, value: ColorMode | null) => {
                // exclusive 模式下点击已选中的按钮会得到 null，此时重新应用被点击的值，
                // 保证颜色模式三态切换器始终有一个明确选中项。
                setMode(value ?? mode)
            }}
        >
            {options.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value} aria-label={opt.label}>
                    {opt.icon}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    )
}
