import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="h2" color="text.primary" sx={{ fontWeight: 700 }}>404</Typography>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </Stack>
    </Box>
  )
}
