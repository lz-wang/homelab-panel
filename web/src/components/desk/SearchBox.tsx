import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

export function SearchBox({ onSearch }: { onSearch: (keyword: string) => void }) {
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
            placeholder="搜索"
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            <Typography
                                variant="caption"
                                sx={{ color: 'text.disabled', userSelect: 'none' }}
                            >
                                {isMac ? '⌘K' : 'Ctrl K'}
                            </Typography>
                        </InputAdornment>
                    ),
                    sx: {
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                    },
                },
            }}
        />
    )
}
