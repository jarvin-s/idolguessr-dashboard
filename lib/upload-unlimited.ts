import { getSupabaseClient } from "./supabase-client"

interface PixelatedImage {
  pixelSize: number
  blob: Blob
}

export async function uploadUnlimitedImages(
  name: string,
  pixelatedImages: PixelatedImage[],
  originalFileName: string,
  groupType: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  const base64Name = btoa(name).replace(/=/g, "")

  console.log("[v0] Base64 name:", base64Name)
  console.log("[v0] Group type:", groupType)

  const groupTypePath = `unlimited/${groupType}`

  const { data: existingFiles, error: listError } = await supabase.storage.from("images").list(groupTypePath, {
    limit: 1000,
    offset: 0,
  })

  if (listError) {
    console.error("[v0] Error listing folders:", listError)
    throw new Error(`Failed to list existing folders: ${listError.message}`)
  }

  console.log("[v0] Existing files:", existingFiles)

  const matchingFolders =
    existingFiles?.filter((file: { name: string }) => file.name.startsWith(base64Name)).map((file: { name: string }) => file.name) || []

  console.log("[v0] Matching folders:", matchingFolders)

  let maxIncrement = 0
  matchingFolders.forEach((folderName: string) => {
    const match = folderName.match(/-(\d+)$/)
    if (match) {
      const increment = Number.parseInt(match[1], 10)
      if (increment > maxIncrement) {
        maxIncrement = increment
      }
    }
  })

  const nextIncrement = maxIncrement + 1
  const folderName = `${base64Name}-${String(nextIncrement).padStart(3, "0")}`

  console.log("[v0] Uploading to folder:", `${groupTypePath}/${folderName}`)

  const fileExtension = originalFileName.split(".").pop() || "png"

  const uploadPromises = pixelatedImages.map(async ({ pixelSize, blob }, index) => {
    const isLastImage = index === pixelatedImages.length - 1
    const fileName = isLastImage
      ? `clear.${fileExtension}`
      : `${String(index + 1).padStart(3, "0")}.${fileExtension}`
    const filePath = `${groupTypePath}/${folderName}/${fileName}`

    console.log("[v0] Uploading:", filePath)

    const { error: uploadError } = await supabase.storage.from("images").upload(filePath, blob, {
      contentType: blob.type,
      upsert: false,
    })

    if (uploadError) {
      console.error("[v0] Upload error for", fileName, ":", uploadError)
      throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`)
    }

    return filePath
  })

  await Promise.all(uploadPromises)

  console.log("[v0] All images uploaded successfully to:", `${groupTypePath}/${folderName}`)

  return `${groupType}/${folderName}`
}
