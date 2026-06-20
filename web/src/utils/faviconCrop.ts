import { type Area } from 'react-easy-crop'

// Favicon export is rendered to a fixed square so it stays crisp at 16/32/48 px.
const FAVICON_OUTPUT_SIZE = 128

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.src = url
    })
}

/**
 * Crop the source image to the given pixel area and export a 128×128 PNG Blob.
 * Returns null if a 2D canvas context is unavailable.
 */
export async function getCroppedImgBlob(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    canvas.width = FAVICON_OUTPUT_SIZE
    canvas.height = FAVICON_OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        FAVICON_OUTPUT_SIZE,
        FAVICON_OUTPUT_SIZE,
    )

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png')
    })
}
