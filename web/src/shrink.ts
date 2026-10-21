/** The presigned POST accepts at most 300 KB (D35, §3.13). Shrink in the browser. */
export const MAX_COVER_BYTES = 300 * 1024

export interface ShrunkCover {
  blob: Blob
  contentType: string
}

/**
 * Re-encode to JPEG, stepping quality then longest edge down until it fits.
 * The file never leaves the device except as the final POST straight to S3 (D49).
 */
export async function shrinkCover(file: File): Promise<ShrunkCover> {
  if (!/^image\/(jpeg|png)$/.test(file.type)) {
    throw new Error('badImage')
  }
  if (file.size <= MAX_COVER_BYTES) {
    return { blob: file, contentType: file.type }
  }

  const bitmap = await createImageBitmap(file)
  for (const maxEdge of [1600, 1200, 900, 700]) {
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await reencode(bitmap, maxEdge, quality)
      if (blob.size <= MAX_COVER_BYTES) {
        bitmap.close()
        return { blob, contentType: 'image/jpeg' }
      }
    }
  }
  bitmap.close()
  throw new Error('tooBig')
}

async function reencode(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('tooBig')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('tooBig')
  return blob
}
