import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@/locales'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

const inputColor = '#fff'

export function SearchBox({ onSearch }: { onSearch: (keyword: string) => void }) {
    const { t } = useTranslation()
    const [value, setValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                inputRef.current?.focus()
                inputRef.current?.select()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    return (
        <TextField
            inputRef={inputRef}
            value={value}
            onChange={(event) => {
                setValue(event.target.value)
                onSearch(event.target.value)
            }}
            fullWidth
            size="small"
            placeholder={t('search.placeholder')}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: inputColor }} />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.5)', userSelect: 'none' }}
                            >
                                {isMac ? '⌘K' : 'Ctrl K'}
                            </Typography>
                        </InputAdornment>
                    ),
                    sx: {
                        bgcolor: 'rgba(15,23,42,0.45)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: 2,
                        color: inputColor,
                        '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.2)',
                            borderStyle: 'solid',
                        },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
                        '&.Mui-focused fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&::placeholder': { color: 'rgba(255,255,255,0.5)' },
                    },
                },
            }}
        />
    )
}
