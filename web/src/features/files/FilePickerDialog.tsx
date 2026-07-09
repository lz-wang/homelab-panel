import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import { FileManagerPanel } from '@/features/files/FileManagerPanel'
import { useTranslation } from '@/locales'

interface Props {
    open: boolean
    onClose: () => void
    onSelect: (url: string) => void
}

export function FilePickerDialog({ open, onClose, onSelect }: Props) {
    const { t } = useTranslation()
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{t('files.pickerTitle')}</DialogTitle>
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
