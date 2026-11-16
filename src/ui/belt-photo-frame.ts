const FRAME_WIDTH = 1150
const FRAME_HEIGHT = 460
export const BELT_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function canvas(width: number, height: number, inspect = false) {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  const context = element.getContext('2d', { alpha: false, willReadFrequently: inspect })
  if (!context) throw new Error('Este navegador não conseguiu preparar a imagem.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  return { element, context }
}

function backdrop(pixel: Uint8ClampedArray, offset: number, minimum: number) {
  return pixel[offset] >= minimum && pixel[offset + 1] >= minimum && pixel[offset + 2] >= minimum
}

function whiteCorner(data: ImageData, x: number, y: number, size: number) {
  let white = 0
  for (let row = y; row < y + size; row++) {
    for (let column = x; column < x + size; column++) {
      if (backdrop(data.data, (row * data.width + column) * 4, 238)) white++
    }
  }
  return white >= size * size * .85
}

function photographBounds(data: ImageData) {
  const { width, height } = data
  const corner = Math.max(2, Math.round(Math.min(width, height) * .02))
  for (const [x, y] of [[0, 0], [width - corner, 0], [0, height - corner], [width - corner, height - corner]]) {
    if (!whiteCorner(data, x, y, corner)) throw new Error('Escolha uma fotografia com fundo branco ou transparente.')
  }
  let left = width
  let top = height
  let right = 0
  let bottom = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (backdrop(data.data, (y * width + x) * 4, 253)) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x + 1)
      bottom = Math.max(bottom, y + 1)
    }
  }
  if (right - left < width * .25 || bottom - top < height * .15) {
    throw new Error('Escolha uma foto em que o cinturão esteja inteiro e ocupe boa parte da imagem.')
  }
  return {
    left: Math.max(0, left - 3), top: Math.max(0, top - 3),
    right: Math.min(width, right + 3), bottom: Math.min(height, bottom + 3),
  }
}

export async function frameBeltPhoto(file: File) {
  if (!BELT_PHOTO_TYPES.includes(file.type) || file.size === 0 || file.size > 12 * 1024 * 1024) {
    throw new Error('Escolha um arquivo JPG, PNG ou WebP de até 12 MB.')
  }
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('O arquivo de imagem não pôde ser aberto.') })
  try {
    if (bitmap.width < 320 || bitmap.height < 100 || bitmap.width * bitmap.height > 32_000_000) {
      throw new Error('Use uma imagem com pelo menos 320 × 100 pixels e no máximo 32 megapixels.')
    }
    const scale = Math.min(1, 720 / bitmap.width, 420 / bitmap.height)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const probe = canvas(width, height, true)
    probe.context.drawImage(bitmap, 0, 0, width, height)
    // Reframe the source pixels without changing the belt's aspect ratio or drawing over it.
    const bounds = photographBounds(probe.context.getImageData(0, 0, width, height))
    const xScale = bitmap.width / width
    const yScale = bitmap.height / height
    const sw = (bounds.right - bounds.left) * xScale
    const sh = (bounds.bottom - bounds.top) * yScale
    const fit = Math.min((FRAME_WIDTH - 64) / sw, (FRAME_HEIGHT - 40) / sh)
    const dw = sw * fit
    const dh = sh * fit
    const output = canvas(FRAME_WIDTH, FRAME_HEIGHT)
    output.context.imageSmoothingQuality = 'high'
    output.context.drawImage(bitmap, bounds.left * xScale, bounds.top * yScale, sw, sh,
      (FRAME_WIDTH - dw) / 2, (FRAME_HEIGHT - dh) / 2, dw, dh)
    return output.element.toDataURL('image/webp', .94)
  } finally {
    bitmap.close()
  }
}
