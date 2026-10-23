/** Read-only identity ledger reconciliation against the encrypted source snapshot. */
import dotenv from "dotenv";
import pg from "pg";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { classifyIdentityRecovery } from "./identity-recovery-classification.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const selection = process.argv[3] ?? "--target=staging";
if (!["--target=staging", "--target=production"].includes(selection) || process.argv.length > 4)
  throw new Error("Explicit staging or pinned read-only production target required.");
let databaseUrl;
if (selection === "--target=production") databaseUrl = productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href;
else { requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL); databaseUrl = process.env.NEON_STAGING_DATABASE_URL; }
const snapshot = await readEncryptedSourceSnapshot(process.argv[2]);
const sourceUsers = snapshot.auth.users.map(text => JSON.parse(text));
const sourceIds = new Set(sourceUsers.map(user => user.id));
const identities = snapshot.auth.identities.map(text => JSON.parse(text));
const target = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 15000 });
target.on("error", () => {});

try {
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const targetSnapshot = (await target.query("SELECT statement_timestamp()::text AS time")).rows[0].time;
  const accounts = (await target.query(`SELECT a.legacy_user_id,a.status AS account_status,
    l.neon_auth_user_id,l.status AS link_status,l.verification_method,l.verified_at,
    u.id AS managed_user_present FROM public.neon_application_accounts a
    LEFT JOIN public.neon_identity_links l ON l.application_account_id=a.id
    LEFT JOIN neon_auth."user" u ON u.id=l.neon_auth_user_id`)).rows;
  const profiles = (await target.query("SELECT user_id,account_status FROM public.profiles WHERE deleted_at IS NULL")).rows;
  const managedUsers = (await target.query('SELECT id FROM neon_auth."user"')).rows;
  const attempts = (await target.query(`SELECT entity_id,count(*)::int AS count FROM public.audit_logs
    WHERE action IN ('neon_identity_link_verified','neon_identity_link_attempt','neon_identity_link_rejected') GROUP BY entity_id`)).rows;
  const records = sourceUsers.map(user => {
    const candidates = accounts.filter(row => row.legacy_user_id === user.id);
    const profile = profiles.find(row => row.user_id === user.id);
    const activeSource = !user.deleted_at && (!user.banned_until ||
      (Number.isFinite(Date.parse(user.banned_until)) && Date.parse(user.banned_until) <= Date.now()));
    const classification = classifyIdentityRecovery({
      sourceActive: activeSource,
      profilePresent: profile?.account_status === "active",
      identityTypes: identities.filter(identity => identity.user_id === user.id).map(identity => identity.provider),
      candidates,
      attemptCount:attempts.find(attempt=>attempt.entity_id===user.id)?.count??0,
    });
    return { account: snapshotFingerprint(user.id), requiredQa: user.email === "qa.admin@merotalent.com",
      identityTypes: [...new Set(identities.filter(identity => identity.user_id === user.id).map(identity => identity.provider))].sort(),
      profilePresent: !!profile, applicationAccountPresent: candidates.length === 1,
      sourceActive: activeSource, verifiedSourceOwnership: classification.status === "LINKED",
      status: classification.status, recoveryTested: classification.recoveryTested, reasonCodes: classification.reasonCodes,
      attempted:classification.attempted,verified:classification.verified,linked:classification.linked };
  });
  console.log(JSON.stringify({ mode: "READ_ONLY_ENCRYPTED_SNAPSHOT_IDENTITY_RECONCILIATION",
    target: selection === "--target=production" ? "pinned-neon-production" : "isolated-neon-staging",
    freshSourceReconciliation: false, sourceWrites: 0, targetWrites: 0,
    sourceSnapshot: snapshot.statementTimestamp, targetSnapshot,
    sourceUsers: records.length, sourceIdentities: identities.length,
    sourceVerifiedLinks: records.filter(record => record.status === "LINKED").length,
    sourceUsersNeedingOwnershipRecovery: records.filter(record => record.status !== "LINKED").length,
    eligibleForProofBasedRecovery: records.filter(record => record.status === "ELIGIBLE_FOR_PROOF_BASED_RECOVERY").length,
    recoveryTestedSourceUsers: records.filter(record => record.recoveryTested).length,
    attemptedSourceUsers:records.filter(record=>record.attempted===true).length,
    attemptEvidenceUnavailable:records.filter(record=>record.attempted===null).length,
    unresolvedSourceUsers: records.filter(record => record.status === "UNRESOLVED").length,
    requiredQaVerified: records.some(record => record.requiredQa && record.verifiedSourceOwnership),
    targetOnlyAccountCount: accounts.filter(row => !sourceIds.has(row.legacy_user_id)).length,
    targetManagedUsers: managedUsers.length,
    targetManagedUsersWithoutVerifiedLink: managedUsers.filter(user => !accounts.some(a => a.neon_auth_user_id === user.id && a.link_status === 'verified')).length,
    targetProfilesWithoutApplicationAccount: profiles.filter(profile => !accounts.some(a => a.legacy_user_id === profile.user_id)).length,
    brokenManagedIdentityLinks: accounts.filter(a => a.neon_auth_user_id && !a.managed_user_present).length,
    collisions: records.filter(record => accounts.filter(row => snapshotFingerprint(row.legacy_user_id) === record.account).length > 1).length,
    records }));
} catch (error) {
  console.error("Snapshot identity reconciliation stopped:", typeof error?.code === "string" ? error.code : "IDENTITY_RECONCILIATION_UNAVAILABLE");
  process.exitCode = 1;
} finally {
  await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
