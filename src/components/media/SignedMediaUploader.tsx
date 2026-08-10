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

export type CollegeMediaModule =
  | "college_logo"
  | "college_cover"
  | "college_gallery";

export interface SignedMediaAsset {
  bucket: "college-media";
  path: string;
  publicUrl: string;
}

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
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error("Sign in again before uploading media.");
  }

  const response = await fetch("/api/v1/media/upload-url", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      module,
      resourceId,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as UploadSigningResponse;
  if (!response.ok || !payload.data) {
    throw new Error(apiErrorMessage(payload));
  }

  const { bucket, path, token } = payload.data;
  if (
    bucket !== "college-media" ||
    typeof path !== "string" ||
    !path ||
    typeof token !== "string" ||
    !token
  ) {
    throw new Error("The upload service returned an invalid destination.");
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "The file upload failed.");
  }

  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { bucket, path, publicUrl };
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

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    setError(null);
    setUploadedCount(0);
    setIsUploading(true);

    try {
      if (files.length > maxFiles) {
        throw new Error(`Choose no more than ${Math.max(0, maxFiles)} images.`);
      }
      const selectedFiles = Array.from(files);
      if (selectedFiles.length === 0) {
        throw new Error("The gallery already contains the maximum number of images.");
      }
      setTotalFiles(selectedFiles.length);
      const assets: SignedMediaAsset[] = [];
      let uploadFailure: unknown = null;

      // Upload in sequence so one gallery selection cannot burst through the
      // per-user signing/quota endpoint with many concurrent requests.
      for (const file of selectedFiles) {
        try {
          assets.push(await uploadSignedCollegeMedia(file, module, resourceId));
          setUploadedCount(assets.length);
        } catch (currentUploadError) {
          uploadFailure = currentUploadError;
          break;
        }
      }

      // Preserve references to files that completed before a later gallery
      // image failed, so successful objects do not become invisible orphans.
      if (assets.length > 0) await onUploaded(assets);
      if (uploadFailure) throw uploadFailure;
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
          accept={acceptedImageTypes.join(",")}
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
            : multiple
              ? "Choose images"
              : "Choose image"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          AVIF, JPEG, PNG or WebP. Files are validated and signed by the server.
        </p>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        {!error && uploadedCount > 0 && !isUploading && (
          <p className="mt-2 flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {uploadedCount} {uploadedCount === 1 ? "image" : "images"} uploaded
          </p>
        )}
      </div>
    </div>
  );
}
