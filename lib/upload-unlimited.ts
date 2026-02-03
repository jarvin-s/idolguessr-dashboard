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
  groupName: string,
  generation?: number,
): Promise<string> {
  const supabase = getSupabaseClient()

  const base64GroupName = btoa(groupName).replace(/=/g, "")
  const base64Name = btoa(name).replace(/=/g, "")

  const groupTypePath = `unlimited/${groupType}/${base64GroupName}`

  const { data: existingFiles, error: listError } = await supabase.storage.from("images").list(groupTypePath, {
    limit: 1000,
    offset: 0,
  })

  if (listError) {
    console.error("[v0] Error listing folders:", listError)
    throw new Error(`Failed to list existing folders: ${listError.message}`)
  }

  const matchingFolders =
    existingFiles?.filter((file: { name: string }) => file.name.startsWith(base64Name)).map((file: { name: string }) => file.name) || []

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

  const fileExtension = originalFileName.split(".").pop() || "png"

  const uploadPromises = pixelatedImages.map(async ({ pixelSize, blob }, index) => {
    const isLastImage = index === pixelatedImages.length - 1
    const fileName = isLastImage
      ? `clear.${fileExtension}`
      : `${String(index + 1).padStart(3, "0")}.${fileExtension}`
    const filePath = `${groupTypePath}/${folderName}/${fileName}`

    const { error: uploadError } = await supabase.storage.from("images").upload(filePath, blob, {
      contentType: blob.type,
      upsert: false,
    })

    if (uploadError) {
      throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`)
    }

    return filePath
  })

  await Promise.all(uploadPromises)

  const { data: insertData, error: insertError } = await supabase
    .from("unlimited_images")
    .insert({
      name: name,
      group_name: groupName,
      img_bucket: folderName,
      group_category: groupType,
      base64_group: base64GroupName,
      base64_idol: base64Name,
      gen: generation,
    })
    .select()

  if (insertError) {
    throw new Error(`Failed to insert unlimited_images record: ${insertError.message}`)
  }

  return `${groupType}/${base64GroupName}/${folderName}`
}
