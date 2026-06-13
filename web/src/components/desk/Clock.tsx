import Typography from '@mui/material/Typography'
import moment from 'moment'
import { useEffect, useState } from 'react'

export function Clock({ hideSecond }: { hideSecond?: boolean }) {
  const [now, setNow] = useState(() => moment())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(moment()), 1000)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <Typography variant="h4" color="common.white" sx={{ fontWeight: 700, textShadow: '0 2px 24px rgba(0,0,0,0.42)' }}>
      {now.format(hideSecond ? 'HH:mm' : 'HH:mm:ss')}
    </Typography>
  )
}
