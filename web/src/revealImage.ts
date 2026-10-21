/**
 * "A ready image to post" (§3.13 reveal). Drawn in code on a canvas, so the site
 * ships no image assets and never calls another origin.
 */
export function revealImageBlob(headline: string, sub: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('no canvas'))

  ctx.fillStyle = '#fbf7f0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#221e1a'
  ctx.font = '500 52px "Instrument Sans", sans-serif'
  ctx.textAlign = 'center'
  wrap(ctx, headline, 600, 280, 940, 64)
  ctx.font = '400 30px "Instrument Sans", sans-serif'
  ctx.fillStyle = '#6a625a'
  ctx.fillText(sub, 600, 470)

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'),
  )
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + i * lineHeight))
}
