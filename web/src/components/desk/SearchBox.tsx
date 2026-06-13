import SearchIcon from '@mui/icons-material/Search'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { useState } from 'react'

import { usePanelStore } from '@/store/panel'

export function SearchBox({ onSearch }: { onSearch: (keyword: string) => void }) {
  const [value, setValue] = useState('')
  const surfaceStyle = usePanelStore(s => s.panelConfig.surfaceStyle)

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
          sx: theme => ({
            bgcolor: surfaceStyle === 'solid'
              ? theme.vars.palette.m3.surfaceContainerHigh
              : `rgba(${theme.vars.palette.primary.mainChannel} / 0.14)`,
            color: theme.vars.palette.m3.onSurface,
            borderRadius: 7,
            backdropFilter: surfaceStyle === 'solid' ? undefined : 'blur(18px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.vars.palette.m3.outlineVariant,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.vars.palette.m3.outline,
            },
          }),
        },
      }}
    />
  )
}
