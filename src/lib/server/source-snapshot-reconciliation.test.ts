import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { canonicalSnapshotValue, hasVerifiedProfileContactReplay, semanticDifferences, sourceNewerProfileContactDelta } from "../../../scripts/source-snapshot-reconciliation.mjs";

const original = { id: "stable-profile", user_id: "stable-user", phone: "updated", location: "source-location",
  account_status: "active", created_at: "2026-01-01T00:00:00.123456Z", updated_at: "2026-10-09T00:00:00Z" };
const target = { ...original, phone: "old", location: "old", updated_at: "2026-08-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00.123Z", job_preferences: { public: false } };

describe("source snapshot semantic reconciliation policy", () => {
  it("treats exact JSON semantics and same-millisecond timestamps as representation differences", () => {
    expect(semanticDifferences({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toEqual([]);
    expect(semanticDifferences(original.created_at, target.created_at, "created_at")[0].reason).toBe("timestamp_precision_or_format");
    expect(semanticDifferences([1, 2], [2, 1])[0].reason).toBe("business_value");
  });
  it("replays only newer source contact changes while preserving target-only fields", () => {
    expect(sourceNewerProfileContactDelta(original, target)).toEqual({ decision: "REPLAY_SOURCE_NEWER_CONTACT_FIELDS", fields: ["location", "phone"] });
    expect(sourceNewerProfileContactDelta(original, { ...target, phone: original.phone, location: original.location }))
      .toMatchObject({ decision: "NO_CONTACT_DELTA" });
  });
  it("denies changed stable ownership, newer target activity, account status and unprovable timestamps", () => {
    expect(sourceNewerProfileContactDelta(original, { ...target, user_id: "different" }).decision).toBe("DENY_OWNERSHIP_MISMATCH");
    expect(sourceNewerProfileContactDelta(original, { ...target, updated_at: "2026-10-13T00:00:00Z" }).decision).toBe("PRESERVE_NEWER_OR_UNORDERED_STAGING_ACTIVITY");
    expect(sourceNewerProfileContactDelta(original, { ...target, account_status: "suspended" }).decision).toBe("PRESERVE_UNRELATED_BUSINESS_CONFLICT");
    expect(sourceNewerProfileContactDelta({ ...original, updated_at: "invalid" }, target).decision).toBe("PRESERVE_NEWER_OR_UNORDERED_STAGING_ACTIVITY");
  });
  it("recognizes an audited contact replay without masking subsequent changes or unrelated-field edits", () => {
    const replayed = { ...original, updated_at: "2026-10-13T00:00:00Z" };
    const audit = { action: "migration_source_profile_contact_delta", entity_type: "profile", entity_id: original.id,
      created_at: replayed.updated_at, metadata: { source_snapshot_sha256: "approved-source-digest", fields: ["phone", "location"],
        applied_source_sha256: createHash("sha256").update(canonicalSnapshotValue({ phone: original.phone, location: original.location })).digest("hex") } };
    expect(hasVerifiedProfileContactReplay(original, replayed, [audit], "approved-source-digest")).toBe(true);
    expect(hasVerifiedProfileContactReplay(original, replayed, [audit], "different-source")).toBe(false);
    expect(hasVerifiedProfileContactReplay(original, { ...replayed, phone: "another-value" }, [audit], "approved-source-digest")).toBe(false);
    expect(hasVerifiedProfileContactReplay(original, { ...replayed, account_status: "suspended" }, [audit], "approved-source-digest")).toBe(false);
    expect(hasVerifiedProfileContactReplay(original, { ...replayed, updated_at: "2026-10-14T00:00:00Z" }, [audit], "approved-source-digest")).toBe(false);
    expect(hasVerifiedProfileContactReplay(original, { ...replayed, user_id: "other-owner" }, [audit], "approved-source-digest")).toBe(false);
  });
});
