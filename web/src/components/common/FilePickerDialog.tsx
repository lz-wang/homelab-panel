import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import { FileManagerPanel } from '@/components/common/FileManagerPanel'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}

export function FilePickerDialog({ open, onClose, onSelect }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>选择文件</DialogTitle>
      <DialogContent>
        <FileManagerPanel
          selectable
          onSelect={(url) => {
            onSelect(url)
            onClose()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
