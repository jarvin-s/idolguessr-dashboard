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
  const shortYear = year.slice(-2)
  const formattedDate = `${day}${month}${shortYear}`

  // Create a date at noon to avoid any timezone edge cases
  const playDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0, 0)
  
  // Get timezone offset for this specific date (handles DST automatically)
  const timezoneOffset = -playDateObj.getTimezoneOffset() // in minutes, inverted
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60)
  const offsetMinutes = Math.abs(timezoneOffset) % 60
  const offsetSign = timezoneOffset >= 0 ? '+' : '-'
  const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
  
  // Format: YYYY-MM-DD 00:00:00+XX:XX (midnight with correct timezone for that date)
  const playDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} 00:00:00${offsetString}`

  const folderPath = `daily/${groupType}/${formattedDate}`

  const fileExtension = originalFileName.split(".").pop() || "png"

  const uploadPromises = pixelatedImages.map(async ({ pixelSize, blob }, index) => {
    const isLastImage = index === pixelatedImages.length - 1
    const fileName = isLastImage
      ? `clear.${fileExtension}`
      : `${String(index + 1).padStart(3, "0")}.${fileExtension}`
    const filePath = `${folderPath}/${fileName}`

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
    throw new Error(`Failed to insert daily record: ${insertError.message}`)
  }

  return `${groupType}/${formattedDate}`
}

