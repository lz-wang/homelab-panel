import Typography from '@mui/material/Typography'
import moment from 'moment'
import { useEffect, useState } from 'react'

export function Clock({ hideSecond, color = '#fff' }: { hideSecond?: boolean; color?: string }) {
    const [now, setNow] = useState(() => moment())

    useEffect(() => {
        const timer = window.setInterval(() => setNow(moment()), 1000)

        return () => window.clearInterval(timer)
    }, [])

    return (
        <Typography variant="h4" sx={{ color, fontWeight: 700, textShadow: '2px 2px 50px #000' }}>
            {now.format(hideSecond ? 'HH:mm' : 'HH:mm:ss')}
        </Typography>
    )
}
