import CheckIcon from '@mui/icons-material/Check'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import {
    amber,
    blue,
    blueGrey,
    brown,
    cyan,
    deepOrange,
    deepPurple,
    green,
    grey,
    indigo,
    lightBlue,
    lightGreen,
    lime,
    orange,
    pink,
    purple,
    red,
    teal,
    yellow,
} from '@mui/material/colors'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

import { useTranslation } from '@/locales'

interface ColorOption {
    label: string
    value: string
}

interface ColorFamily {
    name: string
    shades: ColorOption[]
}

interface Props {
    label: string
    value: string
    onChange: (value: string) => void
}

const materialPrimaryColors: ColorOption[] = [
    { label: 'Red', value: '#F44336' },
    { label: 'Pink', value: '#E91E63' },
    { label: 'Purple', value: '#9C27B0' },
    { label: 'Deep Purple', value: '#673AB7' },
    { label: 'Indigo', value: '#3F51B5' },
    { label: 'Blue', value: '#2196F3' },
    { label: 'Light Blue', value: '#03A9F4' },
    { label: 'Cyan', value: '#00BCD4' },
    { label: 'Teal', value: '#009688' },
    { label: 'Green', value: '#4CAF50' },
    { label: 'Light Green', value: '#8BC34A' },
    { label: 'Lime', value: '#CDDC39' },
    { label: 'Yellow', value: '#FFEB3B' },
    { label: 'Amber', value: '#FFC107' },
    { label: 'Orange', value: '#FF9800' },
    { label: 'Deep Orange', value: '#FF5722' },
    { label: 'Brown', value: '#795548' },
    { label: 'Grey', value: '#9E9E9E' },
    { label: 'Blue Grey', value: '#607D8B' },
]

const quickColors: ColorOption[] = [
    ...materialPrimaryColors,
    { label: 'White', value: '#FFFFFF' },
    { label: 'Black', value: '#000000' },
]

const shadeStrengths = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
const accentStrengths = ['A100', 'A200', 'A400', 'A700']

function buildShades(
    palette: Record<string, string>,
    strengths: string[] = [...shadeStrengths, ...accentStrengths],
) {
    return strengths
        .filter((strength) => palette[strength])
        .map((strength) => ({
            label: strength,
            value: palette[strength].toUpperCase(),
        }))
}

const moreColorFamilies: ColorFamily[] = [
    { name: 'RED', shades: buildShades(red) },
    { name: 'PINK', shades: buildShades(pink) },
    { name: 'PURPLE', shades: buildShades(purple) },
    { name: 'DEEP PURPLE', shades: buildShades(deepPurple) },
    { name: 'INDIGO', shades: buildShades(indigo) },
    { name: 'BLUE', shades: buildShades(blue) },
    { name: 'LIGHT BLUE', shades: buildShades(lightBlue) },
    { name: 'CYAN', shades: buildShades(cyan) },
    { name: 'TEAL', shades: buildShades(teal) },
    { name: 'GREEN', shades: buildShades(green) },
    { name: 'LIGHT GREEN', shades: buildShades(lightGreen) },
    { name: 'LIME', shades: buildShades(lime) },
    { name: 'YELLOW', shades: buildShades(yellow) },
    { name: 'AMBER', shades: buildShades(amber) },
    { name: 'ORANGE', shades: buildShades(orange) },
    { name: 'DEEP ORANGE', shades: buildShades(deepOrange) },
    { name: 'BROWN', shades: buildShades(brown, shadeStrengths) },
    { name: 'GREY', shades: buildShades(grey, shadeStrengths) },
    { name: 'BLUE GREY', shades: buildShades(blueGrey, shadeStrengths) },
]

function getReadableTextColor(value: string) {
    const hex = value.replace('#', '')
    const redChannel = Number.parseInt(hex.slice(0, 2), 16)
    const greenChannel = Number.parseInt(hex.slice(2, 4), 16)
    const blueChannel = Number.parseInt(hex.slice(4, 6), 16)
    const brightness = (redChannel * 299 + greenChannel * 587 + blueChannel * 114) / 1000

    return brightness > 150 ? '#000000' : '#FFFFFF'
}

function ColorSwatchButton({
    color,
    selected,
    onSelect,
}: {
    color: ColorOption
    selected: boolean
    onSelect: () => void
}) {
    const { t } = useTranslation()
    return (
        <Tooltip title={`${color.label} ${color.value}`}>
            <Box
                component="button"
                type="button"
                aria-label={t('color.selectColorAria', {
                    label: color.label,
                    value: color.value,
                })}
                aria-pressed={selected}
                onClick={onSelect}
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    border: '2px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: color.value,
                    boxShadow: selected ? 2 : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getReadableTextColor(color.value),
                    p: 0,
                    transition: 'transform 120ms ease, box-shadow 120ms ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 2,
                    },
                }}
            >
                {selected && <CheckIcon sx={{ fontSize: 18 }} />}
            </Box>
        </Tooltip>
    )
}

export function ColorSwatchPicker({ label, value, onChange }: Props) {
    const { t } = useTranslation()
    const [moreOpen, setMoreOpen] = useState(false)
    const selectedValue = value.toUpperCase()

    return (
        <>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
            >
                <Typography variant="subtitle2" sx={{ minWidth: 88 }}>
                    {label}
                </Typography>
                <Box
                    role="group"
                    aria-label={label}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, minWidth: 0 }}
                >
                    {quickColors.map((color) => (
                        <ColorSwatchButton
                            key={color.value}
                            color={color}
                            selected={selectedValue === color.value}
                            onSelect={() => onChange(color.value)}
                        />
                    ))}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<MoreHorizIcon />}
                        onClick={() => setMoreOpen(true)}
                        sx={{ minHeight: 34 }}
                    >
                        {t('common.more')}
                    </Button>
                </Box>
            </Stack>

            <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{t('color.moreColorsTitle')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ overflowX: 'auto', pt: 1 }}>
                        <Stack spacing={0.75} sx={{ minWidth: 860 }}>
                            {moreColorFamilies.map((family) => (
                                <Box
                                    key={family.name}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '120px 1fr',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{ fontWeight: 800, letterSpacing: 0.5 }}
                                    >
                                        {family.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {family.shades.map((color) => (
                                            <Box
                                                key={`${family.name}-${color.label}`}
                                                component="button"
                                                type="button"
                                                aria-label={t('color.selectMoreAria', {
                                                    family: family.name,
                                                    label: color.label,
                                                    value: color.value,
                                                })}
                                                title={`${family.name} ${color.label} ${color.value}`}
                                                onClick={() => {
                                                    onChange(color.value)
                                                    setMoreOpen(false)
                                                }}
                                                sx={{
                                                    width: 48,
                                                    height: 34,
                                                    borderRadius: 1,
                                                    border:
                                                        selectedValue === color.value
                                                            ? '3px solid'
                                                            : '1px solid',
                                                    borderColor:
                                                        selectedValue === color.value
                                                            ? 'primary.main'
                                                            : 'divider',
                                                    bgcolor: color.value,
                                                    cursor: 'pointer',
                                                    p: 0,
                                                    position: 'relative',
                                                    '&::after': {
                                                        content: `"${color.label}"`,
                                                        position: 'absolute',
                                                        inset: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: getReadableTextColor(color.value),
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        opacity:
                                                            selectedValue === color.value ? 1 : 0,
                                                    },
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button variant="text" onClick={() => setMoreOpen(false)}>
                        {t('common.close')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
}
