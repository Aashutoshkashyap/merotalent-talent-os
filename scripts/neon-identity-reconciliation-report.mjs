/**
 * Read-only, per-user Supabase Auth -> Neon Managed Auth reconciliation.
 *
 * Prints opaque, stable fingerprints rather than emails, UUIDs, provider IDs,
 * password hashes, or tokens. A fingerprint is a pseudonym, not anonymity:
 * anyone already holding a source UUID can compute the same fingerprint.
 * This script NEVER creates an identity link or changes either database.
 */
import { createHash } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });

const sourceUrl = process.env.SUPABASE_DATABASE_URL;
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
const expectedSourceHost = "db.dtirpilgzlsfryucanlg.supabase.co";

if (!sourceUrl || !targetUrl) throw new Error("Both source and isolated staging URLs are required.");
let parsedSource;
try { parsedSource = new URL(sourceUrl); }
catch { throw new Error("Invalid Supabase source URL."); }
if (!["postgres:", "postgresql:"].includes(parsedSource.protocol) || parsedSource.hostname !== expectedSourceHost) {
  throw new Error("Refusing reconciliation: unexpected Supabase source host.");
}
requireNeonMigrationStaging(targetUrl);

const source = new pg.Client({ connectionString: sourceUrl, connectionTimeoutMillis: 10000 });
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 });

const fingerprint = (value) => createHash("sha256")
  .update(`merotalent-neon-identity-reconciliation-v1:${value}`)
  .digest("hex")
  .slice(0, 24);
const normalizedEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";

function increment(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function classify(user, identities, links, sourceEmailCounts, sourceProviderCounts, targetUserIds, targetProfileIds) {
  const reasons = [];
  const email = normalizedEmail(user.email);
  const providerKeys = identities.map(identity => identity.provider_id
    ? `${identity.provider}:${identity.provider_id}` : "");
  const collision = (email && (sourceEmailCounts.get(email) ?? 0) > 1)
    || providerKeys.some(key => key && (sourceProviderCounts.get(key) ?? 0) > 1)
    || links.length > 1;
  if (collision) {
    if (email && (sourceEmailCounts.get(email) ?? 0) > 1) reasons.push("duplicate_normalized_source_email");
    if (providerKeys.some(key => key && (sourceProviderCounts.get(key) ?? 0) > 1)) reasons.push("duplicate_source_provider_account");
    if (links.length > 1) reasons.push("multiple_target_links");
    return { classification: "collision", reasons };
  }

  const verified = links.filter(link => link.link_status === "verified");
  if (verified.length === 1) {
    const link = verified[0];
    if (link.account_status === "active" && targetUserIds.has(link.neon_auth_user_id)
      && targetProfileIds.has(user.id)) {
      return { classification: "verified", reasons: ["explicit_verified_identity_ledger_link"] };
    }
    return { classification: "unresolved", reasons: ["broken_or_disabled_verified_target_link"] };
  }
  if (links.length > 0) return { classification: "unresolved", reasons: ["target_link_not_verified"] };
  if (!targetProfileIds.has(user.id)) return { classification: "unresolved", reasons: ["source_profile_missing_from_target"] };
  if (identities.length === 0) return { classification: "unresolved", reasons: ["no_source_auth_identity"] };

  const googleIdentity = identities.some(identity => identity.provider === "google" && identity.provider_id);
  if (googleIdentity) return {
    classification: "eligible_for_approved_linking_flow",
    reasons: ["google_provider_subject_available", "requires_live_provider_proof_and_explicit_approval"],
  };
  const emailIdentity = identities.some(identity => identity.provider === "email");
  if (emailIdentity && user.email_confirmed_at && email) return {
    classification: "eligible_for_approved_linking_flow",
    reasons: ["verified_email_recovery_candidate", "requires_live_email_proof_and_explicit_approval"],
  };
  if (user.encrypted_password) return {
    classification: "reset_or_reauthentication_required",
    reasons: ["password_hash_import_not_supported_by_verified_managed_auth_path"],
  };
  return { classification: "unresolved", reasons: ["no_supported_identity_proof_path_established"] };
}

let sourceStarted = false;
let targetStarted = false;
try {
  await source.connect();
  await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  sourceStarted = true;
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  targetStarted = true;

  const users = (await source.query(`SELECT id, email, email_confirmed_at, encrypted_password
    FROM auth.users ORDER BY id`)).rows;
  const identities = (await source.query(`SELECT user_id, provider, provider_id
    FROM auth.identities ORDER BY user_id, provider, provider_id`)).rows;
  const links = (await target.query(`SELECT a.legacy_user_id, a.status AS account_status,
      l.neon_auth_user_id, l.status AS link_status
    FROM public.neon_application_accounts a
    JOIN public.neon_identity_links l ON l.application_account_id = a.id
    ORDER BY a.legacy_user_id`)).rows;
  const targetUserIds = new Set((await target.query(`SELECT id FROM neon_auth."user"`)).rows.map(row => row.id));
  const targetProfileIds = new Set((await target.query(`SELECT user_id FROM public.profiles`)).rows.map(row => row.user_id));

  const sourceIds = new Set(users.map(user => user.id));
  const sourceEmailCounts = new Map();
  const sourceProviderCounts = new Map();
  const identitiesByUser = new Map();
  const linksByUser = new Map();
  for (const user of users) increment(sourceEmailCounts, normalizedEmail(user.email));
  for (const identity of identities) {
    const group = identitiesByUser.get(identity.user_id) ?? [];
    group.push(identity);
    identitiesByUser.set(identity.user_id, group);
    if (identity.provider_id) increment(sourceProviderCounts, `${identity.provider}:${identity.provider_id}`);
  }
  for (const link of links) {
    const group = linksByUser.get(link.legacy_user_id) ?? [];
    group.push(link);
    linksByUser.set(link.legacy_user_id, group);
  }

  const classificationByUser = new Map();
  const records = users.map(user => {
    const userIdentities = identitiesByUser.get(user.id) ?? [];
    const record = {
      fingerprint: fingerprint(user.id),
      sourceIdentityTypes: [...new Set(userIdentities.map(identity => identity.provider))].sort(),
      identityCount: userIdentities.length,
      ...classify(user, userIdentities, linksByUser.get(user.id) ?? [],
        sourceEmailCounts, sourceProviderCounts, targetUserIds, targetProfileIds),
    };
    classificationByUser.set(user.id, record);
    return record;
  });
  // Fingerprint order is independent of database collation or query plans.
  records.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  const identityOrdinalByUser = new Map();
  const identityRecords = identities.map(identity => {
    const ordinal = (identityOrdinalByUser.get(identity.user_id) ?? 0) + 1;
    identityOrdinalByUser.set(identity.user_id, ordinal);
    const owner = classificationByUser.get(identity.user_id);
    return {
      fingerprint: fingerprint(`${identity.user_id}:identity:${ordinal}`),
      ownerFingerprint: fingerprint(identity.user_id),
      identityType: identity.provider,
      classification: owner?.classification ?? "unresolved",
      reasons: owner?.reasons ?? ["orphan_source_auth_identity"],
    };
  }).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  const classifications = Object.fromEntries(
    [...new Set(records.map(record => record.classification))].sort()
      .map(key => [key, records.filter(record => record.classification === key).length]),
  );
  const report = {
    mode: "READ_ONLY_RECONCILIATION",
    fingerprintAlgorithm: "first 96 bits of SHA-256(namespace + source UUID); pseudonymous, not anonymous",
    sourceUserCount: users.length,
    sourceIdentityCount: identities.length,
    orphanSourceIdentityCount: identities.filter(identity => !sourceIds.has(identity.user_id)).length,
    targetManagedUserCount: targetUserIds.size,
    targetLinkCount: links.length,
    orphanTargetLinkCount: links.filter(link => !sourceIds.has(link.legacy_user_id)).length,
    classifications,
    records,
    identityRecords,
    important: "Candidates are not linked. Email equality alone never verifies ownership; only a live approved proof flow may create a verified link.",
  };
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error("Read-only reconciliation failed:", error instanceof Error ? error.code ?? error.name : "unknown error");
  process.exitCode = 1;
} finally {
  if (sourceStarted) await source.query("ROLLBACK").catch(() => undefined);
  if (targetStarted) await target.query("ROLLBACK").catch(() => undefined);
  await source.end().catch(() => undefined);
  await target.end().catch(() => undefined);
}
