"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createPixelatedVersions } from "@/lib/pixelate-image"
import { uploadUnlimitedImages } from "@/lib/upload-unlimited"

export default function FormPage() {
  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [groupType, setGroupType] = useState<"boy-group" | "girl-group">("boy-group")
  const [submissionType, setSubmissionType] = useState<"daily" | "unlimited">("unlimited")
  const [isProcessing, setIsProcessing] = useState(false)
  const [pixelatedImages, setPixelatedImages] = useState<{ blob: Blob; pixelSize: number; url: string }[]>([])
  const [uploadStatus, setUploadStatus] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!image) return

    setIsProcessing(true)
    setUploadStatus("")

    try {
      const pixelSizes = [18, 15, 12, 9, 6]
      const pixelatedImagesResult = await createPixelatedVersions(image, pixelSizes)

      const imagesWithUrls = pixelatedImagesResult.map((img) => ({
        ...img,
        url: URL.createObjectURL(img.blob),
      }))
      setPixelatedImages(imagesWithUrls)

      console.log("[v0] Generated pixelated images:", pixelatedImagesResult)
      console.log("[v0] Form data:", { name, date, groupType, submissionType })

      if (submissionType === "unlimited") {
        setUploadStatus("Uploading to storage...")
        const folderName = await uploadUnlimitedImages(name, pixelatedImagesResult, image.name)
        setUploadStatus(`Successfully uploaded to: unlimited/${folderName}`)
      }
    } catch (error) {
      console.error("[v0] Error pixelating images:", error)
      setUploadStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Submit form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter an idol stage name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Group type</Label>
                <RadioGroup
                  value={groupType}
                  onValueChange={(value) => setGroupType(value as "boy-group" | "girl-group")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="boy-group" id="boy-group" />
                    <Label htmlFor="boy-group" className="font-normal cursor-pointer">
                      Boy group
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="girl-group" id="girl-group" />
                    <Label htmlFor="girl-group" className="font-normal cursor-pointer">
                      Girl group
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Submission type</Label>
                <RadioGroup
                  value={submissionType}
                  onValueChange={(value) => setSubmissionType(value as "daily" | "unlimited")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="font-normal cursor-pointer">
                      Daily
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unlimited" id="unlimited" />
                    <Label htmlFor="unlimited" className="font-normal cursor-pointer">
                      Unlimited
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Submit"}
              </Button>

              {uploadStatus && (
                <p
                  className={`text-sm text-center ${uploadStatus.startsWith("Error") ? "text-destructive" : "text-green-600"}`}
                >
                  {uploadStatus}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {pixelatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pixelated versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {pixelatedImages.map((img, index) => (
                  <div key={index} className="space-y-2">
                    <img
                      src={img.url || "/placeholder.svg"}
                      alt={`Pixelated ${img.pixelSize}px`}
                      className="w-full h-auto rounded-lg border"
                    />
                    <p className="text-sm text-center text-muted-foreground">{img.pixelSize}px</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
