import { getSupabaseClient } from "./supabase-client"

interface PixelatedImage {
  pixelSize: number
  blob: Blob
}

export async function uploadDailyImages(
  name: string,
  pixelatedImages: PixelatedImage[],
  originalFileName: string,
  groupType: string,
  date: string,
): Promise<string> {
  const supabase = getSupabaseClient()

  const dateParts = date.split("/")
  if (dateParts.length !== 3) {
    throw new Error("Invalid date format. Expected DD/MM/YYYY")
  }
  const [day, month, year] = dateParts
  // Trim year to last 2 digits (2025 -> 25)
  const shortYear = year.slice(-2)
  const formattedDate = `${day}${month}${shortYear}`

  // Convert DD/MM/YYYY to YYYY-MM-DD 00:00:00+02
  const playDate = `${year}-${month}-${day} 00:00:00+02`

  console.log("[v0] Formatted date:", formattedDate)
  console.log("[v0] Play date:", playDate)
  console.log("[v0] Group type:", groupType)

  const folderPath = `daily/${groupType}/${formattedDate}`

  console.log("[v0] Uploading to folder:", folderPath)

  const fileExtension = originalFileName.split(".").pop() || "png"

  const uploadPromises = pixelatedImages.map(async ({ pixelSize, blob }, index) => {
    const isLastImage = index === pixelatedImages.length - 1
    const fileName = isLastImage
      ? `clear.${fileExtension}`
      : `${String(index + 1).padStart(3, "0")}.${fileExtension}`
    const filePath = `${folderPath}/${fileName}`

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

  console.log("[v0] All images uploaded successfully to:", folderPath)

  // Insert record into daily table
  const { data: insertData, error: insertError } = await supabase
    .from("dailies")
    .insert({
      name: name,
      play_date: playDate,
      group_type: groupType,
      img_bucket: formattedDate,
    })
    .select()

  if (insertError) {
    console.error("[v0] Database insert error:", insertError)
    throw new Error(`Failed to insert daily record: ${insertError.message}`)
  }

  console.log("[v0] Database record inserted:", insertData)

  return `${groupType}/${formattedDate}`
}

