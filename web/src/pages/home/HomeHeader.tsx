import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { Clock } from '@/components/desk/Clock'
import { SearchBox } from '@/components/desk/SearchBox'
import type { PanelConfig } from '@/types/panel'

interface Props {
    panelConfig: PanelConfig
    onSearch: (keyword: string) => void
}

export function HomeHeader({ panelConfig, onSearch }: Props) {
    return (
        <>
            <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center', justifyContent: 'center' }}
            >
                <Typography
                    variant="h3"
                    sx={{ color: '#fff', fontWeight: 700, textShadow: '2px 2px 50px #000' }}
                >
                    {panelConfig.logoText}
                </Typography>
                {panelConfig.clockShow && (
                    <>
                        <Typography sx={{ color: '#fff' }}>|</Typography>
                        <Clock hideSecond={!panelConfig.clockShowSecond} />
                    </>
                )}
            </Stack>

            {panelConfig.searchBoxShow && (
                <Box sx={{ mt: 3, mx: 'auto', maxWidth: 900 }}>
                    <SearchBox onSearch={onSearch} />
                </Box>
            )}
        </>
    )
}
