import { describe, expect, it } from "vitest";
import { requireReviewedConstraints, requireFreshRestoredBackup } from "../../scripts/production-constraint-validation.mjs";

const hash = "a".repeat(64);
const review = { result: "PASS", mode: "dry-run", checked: 21, invalidConstraints: 0,
  checks: Array.from({ length: 21 }, (_, i) => ({ table: `table_${String.fromCharCode(97 + i)}`, name: "status_check", definitionHash: hash })) };
const constraint = { ...review.checks[0], type: "c" };
const backup = { result: "PASS", target: "existing-production-candidate", remoteWrites: 0,
  encryptedReadbackVerified: true, restoredFromEncryptedArchive: true,
  applicationRowAndSchemaFingerprintsVerified: true, archiveSha256: hash };
const envelope = { sha256: hash, format: "merotalent-production-candidate-backup-v1" };

describe("production CHECK validation safety gates", () => {
  it("allows only definitions proved in staging, including an already-validated no-op", () => {
    expect(() => requireReviewedConstraints([constraint], review)).not.toThrow();
    expect(() => requireReviewedConstraints([], review)).not.toThrow();
  });
  it.each([{ table: "other" }, { name: "other_check" }, { type: "f" }, { definitionHash: "b".repeat(64) }, { table: "unsafe;drop" }])("rejects unknown or altered metadata %j", change => {
    expect(() => requireReviewedConstraints([{ ...constraint, ...change }], review)).toThrow("UNREVIEWED");
  });
  it("rejects incomplete, failed or ambiguous review evidence", () => {
    for (const change of [{ result: "BLOCKED" }, { checked: 20 }, { invalidConstraints: 1 }, { checks: Array(21).fill(review.checks[0]) }])
      expect(() => requireReviewedConstraints([constraint], { ...review, ...change })).toThrow();
  });
  it("requires a fresh restored encrypted production backup", () => {
    expect(() => requireFreshRestoredBackup(backup, envelope, 1_000_000, 1_000_001)).not.toThrow();
    for (const change of [{ restoredFromEncryptedArchive: false }, { remoteWrites: 1 }, { target: "staging" }, { applicationRowAndSchemaFingerprintsVerified: false }])
      expect(() => requireFreshRestoredBackup({ ...backup, ...change }, envelope, 1_000_000, 1_000_001)).toThrow("BACKUP_REQUIRED");
    expect(() => requireFreshRestoredBackup(backup, { ...envelope, sha256: "b".repeat(64) }, 1_000_000, 1_000_001)).toThrow();
    expect(() => requireFreshRestoredBackup(backup, envelope, 1, 3_600_002)).toThrow();
    expect(() => requireFreshRestoredBackup(backup, envelope, 1_061_000, 1_000_000)).toThrow();
  });
});
