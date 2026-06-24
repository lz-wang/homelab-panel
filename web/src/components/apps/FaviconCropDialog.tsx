import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

import { uploadImg } from '@/api/files'
import { useNotify } from '@/components/common/NotifyProvider'
import { getCroppedImgBlob } from '@/utils/faviconCrop'

interface FaviconCropDialogProps {
    imageSrc: string
    onCancel: () => void
    onConfirm: (uploadedUrl: string) => void
}

export function FaviconCropDialog({ imageSrc, onCancel, onConfirm }: FaviconCropDialogProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [uploading, setUploading] = useState(false)
    const notify = useNotify()

    const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
        setCroppedAreaPixels(areaPixels)
    }, [])

    async function handleConfirm() {
        if (!croppedAreaPixels) return
        setUploading(true)
        try {
            const blob = await getCroppedImgBlob(imageSrc, croppedAreaPixels)
            if (!blob) {
                notify.error('裁剪失败')
                return
            }
            const file = new File([blob], 'favicon.png', { type: 'image/png' })
            const res = await uploadImg(file)
            if (res.code !== 0 || !res.data?.imageUrl) {
                notify.error(`上传失败:${res.msg}`)
                return
            }
            onConfirm(res.data.imageUrl)
        } finally {
            setUploading(false)
        }
    }

    return (
        <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>裁剪图标</DialogTitle>
            <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: 300,
                        bgcolor: 'common.black',
                    }}
                >
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </Box>
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        缩放
                    </Typography>
                    <Slider
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(_, value) => setZoom(value as number)}
                    />
                </Box>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button onClick={onCancel} disabled={uploading}>
                        取消
                    </Button>
                    <Button variant="contained" loading={uploading} onClick={handleConfirm}>
                        确认裁剪
                    </Button>
                </Stack>
            </Stack>
        </Dialog>
    )
}
