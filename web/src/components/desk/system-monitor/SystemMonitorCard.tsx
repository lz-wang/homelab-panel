import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export function SystemMonitorCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode
  title: string
  value: number
  detail: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: 210,
        p: 1.5,
        bgcolor: 'rgba(20,20,20,0.55)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={value} sx={{ height: 8, borderRadius: 1 }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
          {value}
          % ·
          {' '}
          {detail}
        </Typography>
      </Stack>
    </Paper>
  )
}
