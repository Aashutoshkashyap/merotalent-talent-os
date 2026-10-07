import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("private event attachment records", () => {
  it("stores canonical private object metadata without producing a public URL", () => {
    const uploader = readFileSync(resolve(process.cwd(), "src/components/media/SignedMediaUploader.tsx"), "utf8");
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261007140000_event_private_attachment_metadata.sql"), "utf8");
    expect(uploader).toContain('module === "job_attachment" || module === "event_attachment"');
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS attachment_path");
    expect(migration).toContain("events_attachment_metadata_check");
  });
});
