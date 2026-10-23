/** Pure gates for validating existing CHECKs, never installing new constraints. */
export function requireReviewedConstraints(constraints, review) {
  if (review.result !== "PASS" || review.mode !== "dry-run" || review.checked !== 21 ||
      review.invalidConstraints !== 0 || review.checks?.length !== 21) throw Error("REVIEWED_STAGING_EVIDENCE_REQUIRED");
  const keys = new Set(review.checks.map(c => `${c.table}.${c.name}`));
  if (keys.size !== 21) throw Error("AMBIGUOUS_CONSTRAINT_REVIEW");
  for (const c of constraints) {
    const expected = review.checks.find(r => r.table === c.table && r.name === c.name);
    if (c.type !== "c" || !/^[a-z_]+$/.test(c.table) || !/^[a-z_]+$/.test(c.name) ||
        !expected || !/^[a-f0-9]{64}$/.test(c.definitionHash) || expected.definitionHash !== c.definitionHash) {
      throw Error("UNREVIEWED_PRODUCTION_CONSTRAINT");
    }
  }
}

export function requireFreshRestoredBackup(report, envelope, modifiedAt, now = Date.now()) {
  if (report.result !== "PASS" || report.target !== "existing-production-candidate" ||
      report.remoteWrites !== 0 || report.encryptedReadbackVerified !== true ||
      report.restoredFromEncryptedArchive !== true || report.applicationRowAndSchemaFingerprintsVerified !== true ||
      !/^[a-f0-9]{64}$/.test(report.archiveSha256) || envelope.sha256 !== report.archiveSha256 ||
      envelope.format !== "merotalent-production-candidate-backup-v1" ||
      !Number.isFinite(modifiedAt) || now - modifiedAt > 60 * 60 * 1000 || modifiedAt > now + 60_000) {
    throw Error("FRESH_VERIFIED_PRODUCTION_BACKUP_REQUIRED");
  }
}
