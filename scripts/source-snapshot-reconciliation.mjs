/** Reconciliation rules preserve independent staging activity and source ownership. */
import { createHash } from "node:crypto";
import {SnapshotNumber} from "./lossless-snapshot-json.mjs";

export const snapshotFingerprint = value => createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
export const canonicalSnapshotValue = value => value instanceof SnapshotNumber?value.literal
  : value === null || typeof value !== "object" ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(canonicalSnapshotValue).join(",")}]`
    : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalSnapshotValue(value[key])}`).join(",")}}`;

export function semanticDifferences(sourceValue, targetValue, path = "") {
  if (canonicalSnapshotValue(sourceValue) === canonicalSnapshotValue(targetValue)) return [];
  if(sourceValue instanceof SnapshotNumber || targetValue instanceof SnapshotNumber)return [{path,reason:"business_value",
    sourceType:sourceValue instanceof SnapshotNumber?"number":typeof sourceValue,targetType:targetValue instanceof SnapshotNumber?"number":typeof targetValue,
    sourceHash:snapshotFingerprint(canonicalSnapshotValue(sourceValue)),targetHash:snapshotFingerprint(canonicalSnapshotValue(targetValue))}];
  if (typeof sourceValue === "string" && typeof targetValue === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(sourceValue) && /^\d{4}-\d{2}-\d{2}T/.test(targetValue) &&
      Number.isFinite(Date.parse(sourceValue)) && Date.parse(sourceValue) === Date.parse(targetValue)) {
    return [{ path, reason: "timestamp_precision_or_format", sourceHash: snapshotFingerprint(sourceValue), targetHash: snapshotFingerprint(targetValue) }];
  }
  if (sourceValue && targetValue && typeof sourceValue === "object" && typeof targetValue === "object" &&
      !Array.isArray(sourceValue) && !Array.isArray(targetValue)) {
    return [...new Set([...Object.keys(sourceValue), ...Object.keys(targetValue)])].sort()
      .flatMap(key => semanticDifferences(sourceValue[key], targetValue[key], path ? `${path}.${key}` : key));
  }
  return [{ path, reason: "business_value", sourceType: sourceValue === null ? "null" : typeof sourceValue,
    targetType: targetValue === null ? "null" : typeof targetValue,
    sourceHash: snapshotFingerprint(canonicalSnapshotValue(sourceValue)), targetHash: snapshotFingerprint(canonicalSnapshotValue(targetValue)) }];
}

/** Only source-newer contact fields with the same stable owner are replayable. */
export function sourceNewerProfileContactDelta(source, target) {
  if (!source || !target || source.id !== target.id || source.user_id !== target.user_id) {
    return { decision: "DENY_OWNERSHIP_MISMATCH", fields: [] };
  }
  const comparable = Object.fromEntries(Object.keys(source).map(field => [field, target[field]]));
  const differences = semanticDifferences(source, comparable).filter(field => field.reason === "business_value");
  const contact = differences.filter(field => ["phone", "location"].includes(field.path));
  if (!contact.length) return { decision: "NO_CONTACT_DELTA", fields: [] };
  if (differences.some(field => !["phone", "location", "updated_at"].includes(field.path))) {
    return { decision: "PRESERVE_UNRELATED_BUSINESS_CONFLICT", fields: [] };
  }
  if (!Number.isFinite(Date.parse(source.updated_at)) || !Number.isFinite(Date.parse(target.updated_at)) ||
      Date.parse(source.updated_at) <= Date.parse(target.updated_at)) {
    return { decision: "PRESERVE_NEWER_OR_UNORDERED_STAGING_ACTIVITY", fields: [] };
  }
  return { decision: "REPLAY_SOURCE_NEWER_CONTACT_FIELDS", fields: contact.map(field => field.path) };
}

/** An audited replay explains its update time only while source contact values still match. */
export function hasVerifiedProfileContactReplay(source, target, auditRows, sourceDigest) {
  if (!source || !target || source.id !== target.id || source.user_id !== target.user_id) return false;
  const comparable = Object.fromEntries(Object.keys(source).map(field => [field, target[field]]));
  const differences = semanticDifferences(source, comparable).filter(field => field.reason === "business_value");
  if (!differences.length || differences.some(field => field.path !== "updated_at")) return false;
  return auditRows.some(audit => {
    const metadata = audit.metadata;
    if (audit.action !== "migration_source_profile_contact_delta" || audit.entity_type !== "profile" ||
        audit.entity_id !== String(source.id) || metadata?.source_snapshot_sha256 !== sourceDigest ||
        !Array.isArray(metadata.fields) || !metadata.fields.length ||
        metadata.fields.some(field => !["phone", "location"].includes(field)) ||
        metadata.fields.some(field => canonicalSnapshotValue(source[field]) !== canonicalSnapshotValue(target[field])) ||
        Date.parse(target.updated_at) !== Date.parse(audit.created_at)) return false;
    const contacts = Object.fromEntries(metadata.fields.map(field => [field, source[field]]));
    return createHash("sha256").update(canonicalSnapshotValue(contacts)).digest("hex") === metadata.applied_source_sha256;
  });
}
