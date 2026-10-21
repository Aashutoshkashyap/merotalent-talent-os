import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFingerprints, quoteIdentifier, storageReference,compareRecoveryEvidence } from "./recovery-integrity.mjs";

test("schema verification reports changed definitions even when counts match",()=>{
  assert.deepEqual(compareRecoveryEvidence([{category:"policies",count:2,hash:"a"}],[{category:"policies",count:2,hash:"a"}]),[]);
  assert.equal(compareRecoveryEvidence([{category:"policies",count:2,hash:"a"}],[{category:"policies",count:2,hash:"b"}])[0].reason,"SCHEMA_FINGERPRINT_MISMATCH");
});

test("row integrity refuses deleted, divergent, or extra data", () => {
  const baseline = [{ schema: "public", name: "profiles", count: 1, hash: "a" }];
  assert.doesNotThrow(() => assertFingerprints(baseline, structuredClone(baseline)));
  assert.throws(() => assertFingerprints(baseline, []), /ROW_CONTENT/);
  assert.throws(() => assertFingerprints(baseline, [{ ...baseline[0], hash: "b" }]), /ROW_CONTENT/);
  assert.throws(() => assertFingerprints(baseline, [...baseline, baseline[0]]), /ROW_CONTENT/);
});

test("reference parsing preserves escaped object keys and skips external media", () => {
  assert.deepEqual(storageReference("https://source.supabase.co/storage/v1/object/public/resumes/user/test%20CV.pdf", "resumes"),
    { bucket: "resumes", key: "user/test CV.pdf" });
  assert.deepEqual(storageReference("https://branch.storage.neon.tech/payment-proofs/user/file.pdf?secret=redacted", "payment-proofs"),
    { bucket: "payment-proofs", key: "user/file.pdf" });
  assert.equal(storageReference("https://images.unsplash.com/test.jpg", "college-media"), null);
  assert.equal(storageReference("https://source.supabase.co/storage/v1/object/public/resumes/user/test.pdf", "college-media"), null);
});

test("path traversal and SQL identifiers cannot escape the recovery destination", () => {
  for (const path of ["../file.pdf", "user/../../file.pdf", "user\\file.pdf", "user//file.pdf", "user/\0file"]) {
    assert.throws(() => storageReference(path, "resumes"), /UNSAFE/);
  }
  assert.equal(quoteIdentifier('table"name'), '"table""name"');
});
