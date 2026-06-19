import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SaveIcon from '@mui/icons-material/Save'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type ReactNode } from 'react'

import { AppIcon } from '@/components/common/AppIcon'
import { ColorSwatchPicker } from '@/components/common/ColorSwatchPicker'
import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { useApiAction } from '@/hooks/useApiAction'
import { t } from '@/locales'
import { builtinBackgrounds, defaultPanelConfig, usePanelStore } from '@/store/panel'
import type { ItemInfo, PanelConfig } from '@/types/panel'

function BoolField({
    checked,
    label,
    onChange,
}: {
    checked: boolean
    label: string
    onChange: (checked: boolean) => void
}) {
    return (
        <FormControlLabel
            control={
                <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
            }
            label={label}
        />
    )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {title}
            </Typography>
            {children}
        </Stack>
    )
}

function percentValue(value: number | undefined, fallback: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback

    return value
}

function marginInputProps(min: number, max: number) {
    return {
        slotProps: {
            htmlInput: {
                min,
                max,
                step: 1,
            },
        },
    }
}

function normalizeForm(config: PanelConfig): PanelConfig {
    const defaults = defaultPanelConfig()

    return {
        ...defaults,
        ...config,
        marginTop: percentValue(config.marginTop, defaults.marginTop ?? 3),
        marginBottom: percentValue(config.marginBottom, defaults.marginBottom ?? 2),
        marginX: percentValue(config.marginX, defaults.marginX ?? 5),
    }
}

const appCardAspectRatioOptions = [
    { label: '自动', value: 'auto' },
    { label: '16:9', value: '16 / 9' },
    { label: '2:1', value: '2 / 1' },
    { label: '5:2', value: '5 / 2' },
    { label: '3:1', value: '3 / 1' },
]

const appCardGridMinWidth = 200
const appCardGridGap = 18
const homeContentHorizontalPadding = 32

const appCardPreviewItem: ItemInfo = {
    icon: {
        itemType: 3,
        text: 'line-md:github',
        src: '',
        color: '#FFFFFF',
    },
    title: 'GitHub',
    description: 'Hello world',
    url: 'https://github.com',
    openMethod: 2,
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

function useSettingsForm() {
    const panelConfig = usePanelStore((s) => s.panelConfig)
    const setPanelConfig = usePanelStore((s) => s.setPanelConfig)
    const [form, setForm] = useState<PanelConfig>(() => normalizeForm(panelConfig))
    const { loading: saving, run } = useApiAction()

    useEffect(() => {
        setForm(normalizeForm(panelConfig))
    }, [panelConfig])

    function patch(partial: Partial<PanelConfig>) {
        setForm((prev) => ({ ...prev, ...partial }))
    }

    async function handleSave() {
        await run(async () => setPanelConfig(form), {
            successMessage: t('common.saveSuccess'),
            errorMessage: (response) => `${t('common.saveFail')}:${response.msg}`,
        })
    }

    return { form, patch, handleSave, saving }
}

function SettingsSaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
    return (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button startIcon={<SaveIcon />} loading={saving} onClick={onSave}>
                {t('common.save')}
            </Button>
        </Stack>
    )
}

export function PageSettingsPanel() {
    const { form, patch, handleSave, saving } = useSettingsForm()

    return (
        <Stack spacing={3}>
            <Section title="页面布局">
                <TextField
                    label="面板标题"
                    value={form.logoText ?? ''}
                    onChange={(event) => patch({ logoText: event.target.value })}
                    fullWidth
                />

                <ImageUploadButton
                    label="自定义背景"
                    value={form.backgroundImageSrc ?? ''}
                    onChange={(value) => patch({ backgroundImageSrc: value })}
                />

                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        内置背景
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, minmax(0, 1fr))',
                                sm: 'repeat(4, minmax(0, 1fr))',
                            },
                            gap: 1,
                        }}
                    >
                        {builtinBackgrounds.map((background) => {
                            const selected = form.backgroundImageSrc === background.src

                            return (
                                <ButtonBase
                                    key={background.src}
                                    aria-label={background.label}
                                    onClick={() => patch({ backgroundImageSrc: background.src })}
                                    sx={{
                                        position: 'relative',
                                        aspectRatio: '16 / 9',
                                        overflow: 'hidden',
                                        borderRadius: 1,
                                        border: selected ? '2px solid' : '1px solid',
                                        borderColor: selected ? 'primary.main' : 'divider',
                                        background: `url(${background.src}) center / cover no-repeat`,
                                        boxShadow: selected ? 2 : 0,
                                    }}
                                >
                                    {selected && (
                                        <CheckCircleIcon
                                            color="primary"
                                            sx={{
                                                position: 'absolute',
                                                top: 6,
                                                right: 6,
                                                bgcolor: 'background.paper',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    )}
                                </ButtonBase>
                            )
                        })}
                    </Box>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            背景模糊
                        </Typography>
                        <Slider
                            min={0}
                            max={20}
                            value={form.backgroundBlur ?? 0}
                            onChange={(_, value) => patch({ backgroundBlur: value as number })}
                            valueLabelDisplay="auto"
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            背景遮罩
                        </Typography>
                        <Slider
                            min={0}
                            max={1}
                            step={0.05}
                            value={form.backgroundMaskNumber ?? 0}
                            onChange={(_, value) =>
                                patch({ backgroundMaskNumber: value as number })
                            }
                            valueLabelDisplay="auto"
                        />
                    </Box>
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(3, minmax(0, 1fr))',
                        },
                        gap: 2,
                    }}
                >
                    <TextField
                        label="顶部边距 (%)"
                        type="number"
                        value={form.marginTop ?? 3}
                        onChange={(event) => patch({ marginTop: Number(event.target.value) })}
                        {...marginInputProps(0, 30)}
                    />
                    <TextField
                        label="底部边距 (%)"
                        type="number"
                        value={form.marginBottom ?? 2}
                        onChange={(event) => patch({ marginBottom: Number(event.target.value) })}
                        {...marginInputProps(0, 30)}
                    />
                    <TextField
                        label="横向边距 (%)"
                        type="number"
                        value={form.marginX ?? 5}
                        onChange={(event) => patch({ marginX: Number(event.target.value) })}
                        {...marginInputProps(0, 20)}
                    />
                </Box>
            </Section>

            <Divider />

            <Section title="面板显示">
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 1,
                    }}
                >
                    <BoolField
                        checked={form.clockShow ?? true}
                        label="显示时钟"
                        onChange={(checked) => patch({ clockShow: checked })}
                    />
                    <BoolField
                        checked={form.clockShowSecond ?? false}
                        label="时钟显示秒"
                        onChange={(checked) => patch({ clockShowSecond: checked })}
                    />
                    <BoolField
                        checked={form.searchBoxShow ?? false}
                        label="显示搜索框"
                        onChange={(checked) => patch({ searchBoxShow: checked })}
                    />
                    <BoolField
                        checked={form.footerShow ?? true}
                        label="显示页脚"
                        onChange={(checked) => patch({ footerShow: checked })}
                    />
                </Box>
            </Section>

            <SettingsSaveButton saving={saving} onSave={handleSave} />
        </Stack>
    )
}

export function AppSettingsPanel() {
    const { form, patch, handleSave, saving } = useSettingsForm()
    const viewportWidth = useViewportWidth()
    const appCardAspectRatio =
        form.appCardAspectRatio && form.appCardAspectRatio !== 'auto'
            ? form.appCardAspectRatio
            : undefined
    const previewCardWidth = appCardAutoWidth(viewportWidth, form.marginX)

    return (
        <Stack spacing={3}>
            <Section title="应用卡片预览">
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
                            hideDescription={form.iconTextInfoHideDescription ?? false}
                            borderRadius={form.appCardRadius ?? 16}
                            aspectRatio={appCardAspectRatio}
                            defaultBackgroundColor={form.appCardDefaultColor ?? '#2196F3'}
                        />
                    </Box>
                </Box>
            </Section>

            <Divider />

            <Section title="应用显示">
                <BoolField
                    checked={form.iconTextInfoHideDescription ?? false}
                    label="隐藏描述"
                    onChange={(checked) => patch({ iconTextInfoHideDescription: checked })}
                />

                <Box>
                    <Typography variant="body2" color="text.secondary">
                        应用卡片圆角
                    </Typography>
                    <Slider
                        min={0}
                        max={32}
                        step={1}
                        value={form.appCardRadius ?? 16}
                        onChange={(_, value) => patch({ appCardRadius: value as number })}
                        valueLabelDisplay="auto"
                    />
                </Box>

                <TextField
                    select
                    label="应用卡片长宽比例"
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
                    label="默认颜色"
                    value={form.appCardDefaultColor ?? '#2196F3'}
                    onChange={(value) => patch({ appCardDefaultColor: value })}
                />
            </Section>
            <SettingsSaveButton saving={saving} onSave={handleSave} />
        </Stack>
    )
}
