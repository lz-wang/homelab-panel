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
      sx={theme => ({
        width: 210,
        p: 2,
        borderRadius: 6,
        bgcolor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.14)`,
        color: theme.vars.palette.m3.onSurface,
        border: `1px solid ${theme.vars.palette.m3.outlineVariant}`,
        backdropFilter: 'blur(18px)',
      })}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={value}
          sx={theme => ({
            height: 8,
            borderRadius: 999,
            bgcolor: theme.vars.palette.m3.surfaceContainerHighest,
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: theme.vars.palette.primary.main,
            },
          })}
        />
        <Typography variant="caption" sx={theme => ({ color: theme.vars.palette.m3.onSurfaceVariant })}>
          {value}
          % ·
          {' '}
          {detail}
        </Typography>
      </Stack>
    </Paper>
  )
}
