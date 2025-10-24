import { getSupabaseClient } from "./supabase-client"

interface PixelatedImage {
  pixelSize: number
  blob: Blob
}

export async function uploadUnlimitedImages(
  name: string,
  pixelatedImages: PixelatedImage[],
  originalFileName: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  // Convert name to base64 and take first 5 characters
  const base64Name = btoa(name).substring(0, 5)

  console.log("[v0] Base64 name:", base64Name)

  // List existing folders in unlimited directory to find the next increment
  const { data: existingFiles, error: listError } = await supabase.storage.from("images").list("unlimited", {
    limit: 1000,
    offset: 0,
  })

  if (listError) {
    console.error("[v0] Error listing folders:", listError)
    throw new Error(`Failed to list existing folders: ${listError.message}`)
  }

  console.log("[v0] Existing files:", existingFiles)

  // Find all folders that start with our base64 prefix
  const matchingFolders =
    existingFiles?.filter((file) => file.name.startsWith(base64Name)).map((file) => file.name) || []

  console.log("[v0] Matching folders:", matchingFolders)

  // Find the highest increment number
  let maxIncrement = 0
  matchingFolders.forEach((folderName) => {
    const match = folderName.match(/-(\d+)$/)
    if (match) {
      const increment = Number.parseInt(match[1], 10)
      if (increment > maxIncrement) {
        maxIncrement = increment
      }
    }
  })

  // Next increment
  const nextIncrement = maxIncrement + 1
  const folderName = `${base64Name}-${String(nextIncrement).padStart(3, "0")}`

  console.log("[v0] Uploading to folder:", folderName)

  // Get file extension from original file
  const fileExtension = originalFileName.split(".").pop() || "png"

  // Upload all pixelated images
  const uploadPromises = pixelatedImages.map(async ({ pixelSize, blob }) => {
    const fileName = `${name}_pixel_${pixelSize}.${fileExtension}`
    const filePath = `unlimited/${folderName}/${fileName}`

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

  console.log("[v0] All images uploaded successfully to:", folderName)

  return folderName
}
