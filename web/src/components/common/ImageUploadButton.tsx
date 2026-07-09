import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import UploadIcon from '@mui/icons-material/Upload'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useRef, useState } from 'react'

import { uploadImg } from '@/api/files'
import { useNotify } from '@/components/common/NotifyProvider'
import { FilePickerDialog } from '@/features/files/FilePickerDialog'
import { useTranslation } from '@/locales'

interface Props {
    label: string
    value?: string
    onChange: (url: string) => void
}

export function ImageUploadButton({ label, value, onChange }: Props) {
    const notify = useNotify()
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [uploading, setUploading] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)

    async function handleFileChange(file?: File) {
        if (!file) return

        setUploading(true)

        try {
            const res = await uploadImg(file)

            if (res.code === 0) {
                onChange(res.data.imageUrl)
                notify.success(t('common.uploadSuccess'))
            } else {
                notify.error(`${t('common.saveFail')}:${res.msg}`)
            }
        } catch {
            notify.error(t('common.uploadFail'))
        } finally {
            setUploading(false)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
                label={label}
                value={value ?? ''}
                onChange={(event) => onChange(event.target.value)}
                fullWidth
            />
            <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                loading={uploading}
                onClick={() => inputRef.current?.click()}
                sx={{ minWidth: 120 }}
            >
                {t('common.upload')}
            </Button>
            <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={() => setPickerOpen(true)}
                sx={{ minWidth: 120 }}
            >
                {t('common.choose')}
            </Button>
            <input
                ref={inputRef}
                hidden
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/x-icon"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
            <FilePickerDialog
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onChange}
            />
        </Stack>
    )
}
