import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { useState } from 'react'

export function SearchBox({ onSearch }: { onSearch: (keyword: string) => void }) {
    const [value, setValue] = useState('')

    return (
        <TextField
            value={value}
            onChange={(event) => {
                setValue(event.target.value)
                onSearch(event.target.value)
            }}
            fullWidth
            size="small"
            placeholder="Search"
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    sx: {
                        bgcolor: 'rgba(255,255,255,0.86)',
                        borderRadius: 2,
                    },
                },
            }}
        />
    )
}
