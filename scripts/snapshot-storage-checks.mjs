import { snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { storageReference } from "./recovery-integrity.mjs";
export function compareObjectProof({ expected, source, target, expectedType, targetType, expectedCacheControl, targetCacheControl }) {
  return { sourceManifestMatch: !!source && source.sha256 === expected.sourceSha256 && source.bytes === expected.sourceBytes,
    targetManifestMatch: !!target && target.sha256 === expected.sourceSha256 && target.bytes === expected.sourceBytes,
    contentTypeMatch: expectedType === targetType,
    cacheControlMatch: (expectedCacheControl ?? "") === (targetCacheControl ?? "") };
}
export function snapshotStorageReferences(snapshot) {
  const refs = new Map();
  const fields = {
    profiles: { resume_url: "resumes", avatar_url: "profile-media" },
    institutes: { logo_url: "college-media", cover_image_url: "college-media", gallery_urls: "college-media", chairperson_image_url: "college-media", principal_image_url: "college-media" },
    mentors: { profile_image_url: "mentor-media", cover_image_url: "mentor-media" },
    events: { cover_image_url: "event-media", attachment_path: "event-attachments" },
    payment_proofs: { storage_path: "payment-proofs" }, messages: { attachment_path: "chat-attachments" },
    job_applications: { resume_url: "resumes", cover_letter_file_url: "job-files" }, advertisements: { image_url: "ad-media" },
  };
  const add = (value,bucket) => {
    const ref = storageReference(value,bucket);
    if (ref) refs.set(JSON.stringify([ref.bucket,ref.key]),ref);
  };
  for (const [table, columns] of Object.entries(fields)) for (const text of snapshot.public[table] ?? []) {
    const row = JSON.parse(text);
    for (const [field,bucket] of Object.entries(columns)) {
      for (const value of Array.isArray(row[field]) ? row[field] : [row[field]]) add(value,bucket);
    }
    if (table === "job_applications") for (const field of ["experienceLetterUrl","trainingDocumentUrl"]) add(row.form_data?.[field],"job-files");
  }
  const objectSet = new Set(snapshot.storage.objects.map(text => { const o=JSON.parse(text);return JSON.stringify([o.bucket_id,o.name]); }));
  return [...refs].map(([id,ref]) => ({ ...ref, pathFingerprint:snapshotFingerprint(ref.key), presentInSource:objectSet.has(id) }));
}
