/**
 * Pixelates an image using Canvas API
 * @param file - The image file to pixelate
 * @param pixelSize - The size of each pixel block
 * @returns Promise<Blob> - The pixelated image as a Blob
 */
export async function pixelateImage(file: File, pixelSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("Could not get canvas context"))
      return
    }

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      ctx.drawImage(img, 0, 0)

      ctx.imageSmoothingEnabled = false

      const scaledWidth = Math.ceil(img.width / pixelSize)
      const scaledHeight = Math.ceil(img.height / pixelSize)

      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

      ctx.drawImage(canvas, 0, 0, scaledWidth, scaledHeight, 0, 0, img.width, img.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to create blob from canvas"))
          }
        },
        file.type,
        0.95,
      )
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Creates multiple pixelated versions of an image
 * @param file - The original image file
 * @param pixelSizes - Array of pixel sizes to generate
 * @returns Promise<Array<{pixelSize: number, blob: Blob}>>
 */
export async function createPixelatedVersions(
  file: File,
  pixelSizes: number[],
): Promise<Array<{ pixelSize: number; blob: Blob }>> {
  const results = await Promise.all(
    pixelSizes.map(async (pixelSize) => {
      const blob = await pixelateImage(file, pixelSize)
      return { pixelSize, blob }
    }),
  )
  return results
}
