"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import { AccessModal } from "@/components/access-modal";
import { createPixelatedVersions } from "@/lib/pixelate-image";
import { uploadUnlimitedImages } from "@/lib/upload-unlimited";
import { uploadDailyImages } from "@/lib/upload-daily";
import { RecentDailiesOverview } from "@/components/recent-dailies-overview";
import groupsData from "@/data/groups.json";

export default function FormPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [group, setGroup] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [groupType, setGroupType] = useState<"boy-group" | "girl-group">(
    "boy-group"
  );
  const [submissionType, setSubmissionType] = useState<"daily" | "unlimited">(
    "unlimited"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixelatedImages, setPixelatedImages] = useState<
    { blob: Blob; pixelSize: number; url: string }[]
  >([]);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const filteredGroups = groupsData
    .filter((g) => g.type === groupType)
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

  useEffect(() => {
    const accessGranted = sessionStorage.getItem("access_granted");
    setHasAccess(accessGranted === "true");
  }, []);

  useEffect(() => {
    setGroup("");
  }, [groupType]);

  const handleFileSelect = (file: File | null) => {
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!image) {
      setUploadStatus("Error: Please select an image");
      return;
    }

    setIsProcessing(true);
    setUploadStatus("");

    try {
      const pixelSizes = [18, 15, 12, 9, 6];
      const pixelatedImagesResult = await createPixelatedVersions(
        image,
        pixelSizes
      );

      const originalBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          fetch(reader.result as string)
            .then((res) => res.blob())
            .then(resolve)
            .catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });

      const allImages = [
        ...pixelatedImagesResult,
        { pixelSize: 0, blob: originalBlob },
      ];

      const imagesWithUrls = allImages.map((img) => ({
        ...img,
        url: URL.createObjectURL(img.blob),
      }));
      setPixelatedImages(imagesWithUrls);

      setUploadStatus("Uploading to storage...");

      if (submissionType === "unlimited") {
        const folderName = await uploadUnlimitedImages(
          name,
          allImages,
          image.name,
          groupType,
          group
        );
        setUploadStatus(`Successfully uploaded to: unlimited/${folderName}`);
      } else if (submissionType === "daily") {
        const folderName = await uploadDailyImages(
          name,
          allImages,
          image.name,
          groupType,
          date,
          group
        );
        setUploadStatus(`Successfully uploaded to: daily/${folderName}`);
      }
    } catch (error) {
      console.error("[v0] Error pixelating images:", error);
      setUploadStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    return <AccessModal onAccessGranted={() => setHasAccess(true)} />;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/2">
            <RecentDailiesOverview />
          </div>
          <div className="w-full lg:w-1/2">
            <Card className="w-full">
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
                    <Label htmlFor="group">Group</Label>
                    <Combobox
                      value={group}
                      onValueChange={setGroup}
                      options={filteredGroups}
                      placeholder="Select a group..."
                      emptyText="No group found."
                      searchPlaceholder="Search group..."
                    />
                  </div>

                  {submissionType === "daily" && (
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={date}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d/]/g, "");
                          setDate(value);
                        }}
                        pattern="\d{2}/\d{2}/\d{4}"
                        maxLength={10}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Group type</Label>
                    <RadioGroup
                      value={groupType}
                      onValueChange={(value) =>
                        setGroupType(value as "boy-group" | "girl-group")
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="boy-group" id="boy-group" />
                        <Label
                          htmlFor="boy-group"
                          className="font-normal cursor-pointer"
                        >
                          Boy group
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="girl-group" id="girl-group" />
                        <Label
                          htmlFor="girl-group"
                          className="font-normal cursor-pointer"
                        >
                          Girl group
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>Submission type</Label>
                    <RadioGroup
                      value={submissionType}
                      onValueChange={(value) =>
                        setSubmissionType(value as "daily" | "unlimited")
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <Label
                          htmlFor="daily"
                          className="font-normal cursor-pointer"
                        >
                          Daily
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unlimited" id="unlimited" />
                        <Label
                          htmlFor="unlimited"
                          className="font-normal cursor-pointer"
                        >
                          Unlimited
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Image</Label>
                    <div className="relative">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleFileSelect(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                      <label
                        htmlFor="image"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center w-full min-h-32 border-2 border-dashed cursor-pointer transition-all duration-200 ${
                          isDragging
                            ? "border-primary bg-primary/10 scale-[1.02]"
                            : "border-border hover:bg-accent/50 hover:border-primary/50"
                        }`}
                      >
                        {imagePreview ? (
                          <div className="relative w-full h-full p-4">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-w-full max-h-64 mx-auto object-contain"
                            />
                            <p className="mt-2 text-sm text-center text-muted-foreground">
                              {image?.name}
                            </p>
                            <p className="text-xs text-center text-muted-foreground">
                              Click or drag to replace
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg
                              className={`w-8 h-8 mb-3 transition-colors ${
                                isDragging
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <p className="mb-2 text-sm text-muted-foreground">
                              <span className="font-semibold">
                                {isDragging
                                  ? "Drop image here"
                                  : "Click to upload"}
                              </span>
                              {!isDragging && " or drag and drop"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full cursor-pointer bg-purple-400 hover:bg-purple-400/90"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Submit"}
                  </Button>

                  {uploadStatus && (
                    <p
                      className={`text-sm text-center ${
                        uploadStatus.startsWith("Error")
                          ? "text-destructive"
                          : "text-green-600"
                      }`}
                    >
                      {uploadStatus}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {pixelatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pixelated versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {pixelatedImages.map((img, index) => (
                  <div key={index} className="space-y-2">
                    <img
                      src={img.url || "/placeholder.svg"}
                      alt={
                        img.pixelSize === 0
                          ? "Clear"
                          : `Pixelated ${img.pixelSize}px`
                      }
                      className="w-full h-auto border"
                    />
                    <p className="text-sm text-center text-muted-foreground">
                      {img.pixelSize === 0 ? "Clear" : `${img.pixelSize}px`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
