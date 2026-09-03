import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

import { AppIcon } from '@/components/common/AppIcon'
import { ColorSwatchPicker } from '@/components/common/ColorSwatchPicker'
import { useTranslation } from '@/locales'
import type { ItemInfo } from '@/types/panel'
import { BoolField, Section, SettingsSaveButton, useSettingsForm } from './SettingsShared'

const appCardGridMinWidth = 200
const appCardGridGap = 18
const homeContentHorizontalPadding = 32

const appCardPreviewItem: ItemInfo = {
    icon: {
        text: 'line-md:github',
        color: '#FFFFFF',
    },
    title: 'GitHub',
    description: 'Hello world',
    url: 'https://github.com',
}

function currentViewportWidth() {
    if (typeof window === 'undefined') return 1280

    return window.innerWidth
}

function useViewportWidth() {
    const [viewportWidth, setViewportWidth] = useState(currentViewportWidth)

    useEffect(() => {
        function handleResize() {
            setViewportWidth(currentViewportWidth())
        }

        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return viewportWidth
}

function appCardAutoWidth(viewportWidth: number, marginX: number | undefined) {
    const horizontalMarginRatio = Math.min(40, Math.max(0, marginX ?? 5) * 2) / 100
    const contentWidth = Math.max(appCardGridMinWidth, viewportWidth - homeContentHorizontalPadding)
    const appAreaWidth = Math.max(appCardGridMinWidth, contentWidth * (1 - horizontalMarginRatio))
    const columnCount = Math.max(
        1,
        Math.floor((appAreaWidth + appCardGridGap) / (appCardGridMinWidth + appCardGridGap)),
    )

    return Math.round((appAreaWidth - (columnCount - 1) * appCardGridGap) / columnCount)
}

export function AppSettingsPanel() {
    const { form, patch, handleSave, saving } = useSettingsForm()
    const viewportWidth = useViewportWidth()
    const { t } = useTranslation()
    const appCardAspectRatio =
        form.appCardAspectRatio && form.appCardAspectRatio !== 'auto'
            ? form.appCardAspectRatio
            : undefined
    const previewCardWidth = appCardAutoWidth(viewportWidth, form.marginX)
    const appCardAspectRatioOptions = [
        { label: t('common.auto'), value: 'auto' },
        { label: '16:9', value: '16 / 9' },
        { label: '2:1', value: '2 / 1' },
        { label: '5:2', value: '5 / 2' },
        { label: '3:1', value: '3 / 1' },
    ]

    return (
        <Stack spacing={3}>
            <Section title={t('settings.cardPreviewSection')}>
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'rgba(15, 23, 42, 0.28)',
                    }}
                >
                    <Box sx={{ width: previewCardWidth, maxWidth: '100%', mx: 'auto' }}>
                        <AppIcon
                            item={appCardPreviewItem}
                            showDescription={form.iconTextInfoShowDescription ?? false}
                            borderRadius={form.appCardRadius ?? 16}
                            aspectRatio={appCardAspectRatio}
                            defaultBackgroundColor={form.appCardDefaultColor ?? '#2196F3'}
                        />
                    </Box>
                </Box>
            </Section>

            <Divider />

            <Section title={t('settings.appDisplaySection')}>
                <BoolField
                    checked={form.iconTextInfoShowDescription ?? false}
                    label={t('settings.showDesc')}
                    onChange={(checked) => patch({ iconTextInfoShowDescription: checked })}
                />

                <Box>
                    <Typography variant="body2" color="text.secondary">
                        {t('settings.cardRadius')}
                    </Typography>
                    <Slider
                        min={0}
                        max={64}
                        step={1}
                        value={form.appCardRadius ?? 20}
                        onChange={(_, value) => patch({ appCardRadius: value as number })}
                        valueLabelDisplay="auto"
                    />
                </Box>

                <TextField
                    select
                    label={t('settings.cardRatio')}
                    value={form.appCardAspectRatio ?? 'auto'}
                    onChange={(event) => patch({ appCardAspectRatio: event.target.value })}
                    fullWidth
                >
                    {appCardAspectRatioOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </TextField>

                <ColorSwatchPicker
                    label={t('settings.defaultColor')}
                    value={form.appCardDefaultColor ?? '#2196F3'}
                    onChange={(value) => patch({ appCardDefaultColor: value })}
                />
            </Section>
            <SettingsSaveButton saving={saving} onSave={handleSave} />
        </Stack>
    )
}
