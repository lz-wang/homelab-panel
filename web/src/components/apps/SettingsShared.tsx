import SaveIcon from '@mui/icons-material/Save'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useApiAction } from '@/hooks/useApiAction'
import { useTranslation } from '@/locales'
import { defaultPanelConfig, usePanelStore } from '@/store/panel'
import type { PanelConfig } from '@/types/panel'

// 设置面板共享的基础组件与表单逻辑：Page/App/Misc 三个面板 chunk 共同引用，
// Rollup 会将其提取为公共 chunk，随最先加载的面板一起到达。

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

function useSettingsForm() {
    const panelConfig = usePanelStore((s) => s.panelConfig)
    const setPanelConfig = usePanelStore((s) => s.setPanelConfig)
    const [form, setForm] = useState<PanelConfig>(() => normalizeForm(panelConfig))
    const { loading: saving, run } = useApiAction()
    const initialFaviconRef = useRef(panelConfig.faviconSrc)
    const { t } = useTranslation()

    useEffect(() => {
        setForm(normalizeForm(panelConfig))
    }, [panelConfig])

    function patch(partial: Partial<PanelConfig>) {
        setForm((prev) => ({ ...prev, ...partial }))
    }

    async function handleSave() {
        const faviconChanged = initialFaviconRef.current !== form.faviconSrc
        await run(async () => setPanelConfig(form), {
            successMessage: faviconChanged
                ? t('settings.faviconSavedHint')
                : t('common.saveSuccess'),
            errorMessage: (response) => `${t('common.saveFail')}:${response.msg}`,
        })
        if (faviconChanged) {
            initialFaviconRef.current = form.faviconSrc
        }
    }

    return { form, patch, handleSave, saving }
}

function SettingsSaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
    const { t } = useTranslation()

    return (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button startIcon={<SaveIcon />} loading={saving} onClick={onSave}>
                {t('common.save')}
            </Button>
        </Stack>
    )
}

export { BoolField, Section, SettingsSaveButton, useSettingsForm }
