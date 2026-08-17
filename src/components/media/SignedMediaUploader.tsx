import { useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const acceptedImageTypes = [
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const acceptedDocumentTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type CollegeMediaModule =
  | "college_logo"
  | "college_cover"
  | "college_gallery"
  | "event_cover"
  | "course_thumbnail"
  | "mentor_profile"
  | "advertisement"
  | "company_logo"
  | "job_attachment";

export interface SignedMediaAsset {
  bucket: string;
  path: string;
  publicUrl: string;
}

const signedBucketByModule: Partial<Record<CollegeMediaModule, string>> = {
  college_logo: "college-media",
  college_cover: "college-media",
  college_gallery: "college-media",
  mentor_profile: "mentor-media",
  event_cover: "event-media",
  course_thumbnail: "course-media",
  advertisement: "ad-media",
  job_attachment: "job-files",
};

interface UploadSigningResponse {
  data?: {
    bucket?: unknown;
    path?: unknown;
    signedUrl?: unknown;
    token?: unknown;
  } | null;
  error?: {
    message?: unknown;
  } | null;
}

export interface SignedMediaUploaderProps {
  label: string;
  module: CollegeMediaModule;
  resourceId: string;
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  onUploaded: (assets: SignedMediaAsset[]) => void | Promise<void>;
}

const apiErrorMessage = (payload: UploadSigningResponse) =>
  typeof payload.error?.message === "string"
    ? payload.error.message
    : "The upload could not be prepared.";

const MODULE_MAX_DIMENSIONS: Partial<Record<CollegeMediaModule, number>> = {
  college_logo: 600,
  company_logo: 600,
  mentor_profile: 800,
  college_cover: 1920,
  college_gallery: 1600,
  event_cover: 1920,
  course_thumbnail: 1200,
  advertisement: 1920,
};

async function compressImage(file: File, module?: CollegeMediaModule): Promise<File> {
  // If not in browser, not an image, small file (< 200KB), or SVG/GIF: return original file
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof Image === "undefined" ||
    !file.type.startsWith("image/") ||
    file.size < 200 * 1024 ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  const maxDim = (module && MODULE_MAX_DIMENSIONS[module]) || 1920;

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (result: File) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // Safety timeout to prevent hangs in headless/jsdom environments
    const timer = setTimeout(() => {
      safeResolve(file);
    }, 1000);

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          safeResolve(file);
          return;
        }

        // Smooth resizing quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Attempt high-quality WebP first (supported by all modern browsers)
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".webp"),
                {
                  type: "image/webp",
                  lastModified: Date.now(),
                }
              );
              safeResolve(compressedFile);
              return;
            }

            // Fallback to high-quality JPEG if WebP wasn't smaller or failed
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob && jpegBlob.size < file.size) {
                  const jpegFile = new File(
                    [jpegBlob],
                    file.name.replace(/\.[^/.]+$/, ".jpg"),
                    {
                      type: "image/jpeg",
                      lastModified: Date.now(),
                    }
                  );
                  safeResolve(jpegFile);
                  return;
                }
                safeResolve(file);
              },
              "image/jpeg",
              0.88
            );
          },
          "image/webp",
          0.88
        );
      };
      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        safeResolve(file);
      };
      img.src = url;
    } catch {
      clearTimeout(timer);
      safeResolve(file);
    }
  });
}

/**
 * Signs and uploads a college image without exposing a service-role credential
 * to the browser. The database stores the canonical object path; public URLs
 * are derived only for the explicitly public `college-media` bucket.
 */
export async function uploadSignedCollegeMedia(
  file: File,
  module: CollegeMediaModule,
  resourceId: string,
): Promise<SignedMediaAsset> {
  const processedFile = await compressImage(file, module);
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Sign in again before uploading media.");
  }

  let response: Response;
  try {
    response = await fetch("/api/v1/media/upload-url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module,
          resourceId,
          fileName: processedFile.name,
          contentType: processedFile.type,
          sizeBytes: processedFile.size,
        }),
      });
  } catch {
    throw new Error("The secure upload service is unavailable. Please try again.");
  }

  const payload = (await response.json().catch(() => ({}))) as UploadSigningResponse;
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload));
  }

  const bucket = payload.data?.bucket;
  const path = payload.data?.path;
  const token = payload.data?.token;
  const expectedBucket = signedBucketByModule[module];

  if (
    !expectedBucket ||
    typeof bucket !== "string" ||
    bucket !== expectedBucket ||
    typeof path !== "string" ||
    path.length === 0 ||
    typeof token !== "string" ||
    token.length === 0
  ) {
    throw new Error("The upload service returned an invalid destination.");
  }

  const { error: uploadError } = await supabase.storage
    .from(expectedBucket)
    .uploadToSignedUrl(path, token, processedFile, {
      cacheControl: "3600",
      contentType: processedFile.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error("The signed media upload failed. Please try again.");
  }

  // Applicant documents live in a private bucket. Consumers should retain the
  // canonical object path and request a short-lived download URL server-side.
  const publicUrl = module === "job_attachment"
    ? ""
    : supabase.storage.from(expectedBucket).getPublicUrl(path).data.publicUrl;
  return { bucket: expectedBucket, path, publicUrl };
}

export function SignedMediaUploader({
  label,
  module,
  resourceId,
  multiple = false,
  maxFiles = multiple ? 30 : 1,
  disabled = false,
  onUploaded,
}: SignedMediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const isDocumentUpload = module === "job_attachment";
  const acceptedTypes = isDocumentUpload
    ? acceptedDocumentTypes
    : acceptedImageTypes;

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setError(null);
    setUploadedCount(0);
    setIsUploading(true);

    try {
      if (files.length > maxFiles) {
        throw new Error(`Choose no more than ${Math.max(0, maxFiles)} files.`);
      }
      const selectedFiles = Array.from(files);
      if (selectedFiles.length === 0) {
        throw new Error("No files were selected.");
      }
      setTotalFiles(selectedFiles.length);

      let completed = 0;
      const uploadPromises = selectedFiles.map(async (file) => {
        const asset = await uploadSignedCollegeMedia(file, module, resourceId);
        completed++;
        setUploadedCount(completed);
        return asset;
      });

      const assets = await Promise.all(uploadPromises);
      if (assets.length > 0) await onUploaded(assets);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The file upload failed.",
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <Input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          multiple={multiple}
          disabled={disabled || isUploading}
          className="sr-only"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {isUploading
            ? `Uploading${multiple ? ` (${uploadedCount}/${totalFiles})` : ""}...`
            : isDocumentUpload
              ? "Choose file"
              : multiple
              ? "Choose images"
              : "Choose image"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          {isDocumentUpload
            ? "PDF, DOC or DOCX, up to 5 MB. The private upload is validated and signed by the server."
            : "AVIF, JPEG, PNG or WebP. Files are validated and signed by the server."}
        </p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {!error && uploadedCount > 0 && !isUploading && (
          <p className="mt-2 flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {uploadedCount} {uploadedCount === 1 ? "file" : "files"} uploaded
          </p>
        )}
      </div>
    </div>
  );
}
