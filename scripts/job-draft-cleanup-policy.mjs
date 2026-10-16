const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const draftPath = new RegExp(`^(${uuid})/job_attachment/(${uuid})/(${uuid})\\.pdf$`, "i");

/** Defense in depth beyond the locked SQL state and application-reference check. */
export function isConservativeDraftCandidate(row, now = Date.now()) {
  if (row?.state !== "draft" || row.application_id || !row.path || !row.user_id || !row.job_id) return false;
  const uploadedAt = new Date(row.uploaded_at).getTime();
  if (!Number.isFinite(uploadedAt) || uploadedAt > now - 72 * 60 * 60 * 1000) return false;
  const match = draftPath.exec(row.path);
  return !!match && match[1].toLowerCase() === row.user_id.toLowerCase()
    && match[2].toLowerCase() === row.job_id.toLowerCase();
}
