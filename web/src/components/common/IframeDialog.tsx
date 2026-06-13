import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  title: string
  src: string
  onClose: () => void
}

export function IframeDialog({ open, title, src, onClose }: Props) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open)
      setLoading(true)
  }, [open, src])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            height: '80vh',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent sx={{ p: 0 }}>
        {src && (
          <iframe
            title={title}
            src={src}
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              display: loading ? 'none' : 'block',
            }}
            onLoad={() => setLoading(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
