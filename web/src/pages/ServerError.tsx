import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function ServerError() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Typography variant="h2" color="text.primary" sx={{ fontWeight: 700 }}>500</Typography>
    </Box>
  )
}
