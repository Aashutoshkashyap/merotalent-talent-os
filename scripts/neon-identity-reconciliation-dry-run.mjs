/** Read-only Supabase Auth to Neon Managed Auth identity inventory. Never imports users. */
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceUrl = process.env.SUPABASE_DATABASE_URL;
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
if (new URL(sourceUrl).hostname !== "db.dtirpilgzlsfryucanlg.supabase.co") {
  throw new Error("Refusing dry run: unexpected Supabase source host.");
}
requireNeonMigrationStaging(targetUrl);
const source = new pg.Client({ connectionString: sourceUrl, connectionTimeoutMillis: 10000 });
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 10000 });

function duplicateCount(values) {
  const seen = new Set();
  let duplicates = 0;
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates += 1;
    else seen.add(value);
  }
  return duplicates;
}

try {
  await source.connect();
  await source.query("BEGIN READ ONLY");
  await target.connect();
  const users = (await source.query(`SELECT id, email, email_confirmed_at, encrypted_password
    FROM auth.users ORDER BY id`)).rows;
  const identities = (await source.query(`SELECT user_id, provider, provider_id
    FROM auth.identities ORDER BY user_id, provider, provider_id`)).rows;
  const links = (await target.query(`SELECT a.legacy_user_id, l.neon_auth_user_id, l.status
    FROM public.neon_application_accounts a
    JOIN public.neon_identity_links l ON l.application_account_id=a.id`)).rows;
  const managedUsers = (await target.query(`SELECT id FROM neon_auth."user"`)).rows;
  const userIds = new Set(users.map(user => user.id));
  const identityCounts = new Map();
  const providerCounts = {};
  for (const identity of identities) {
    identityCounts.set(identity.user_id, (identityCounts.get(identity.user_id) ?? 0) + 1);
    providerCounts[identity.provider] = (providerCounts[identity.provider] ?? 0) + 1;
  }
  const mappedLegacy = links.filter(link => userIds.has(link.legacy_user_id));
  const report = {
    mode: "DRY_RUN_ONLY",
    source: {
      users: users.length,
      identities: identities.length,
      providers: providerCounts,
      verifiedEmails: users.filter(user => user.email_confirmed_at).length,
      passwordHashesPresent: users.filter(user => user.encrypted_password).length,
      dualOrMultiIdentityUsers: [...identityCounts.values()].filter(count => count > 1).length,
      missingIdentities: users.filter(user => !identityCounts.has(user.id)).length,
      orphanIdentities: identities.filter(identity => !userIds.has(identity.user_id)).length,
      duplicateNormalizedEmails: duplicateCount(users.map(user => user.email?.trim().toLowerCase())),
      duplicateProviderAccounts: duplicateCount(identities.map(identity => `${identity.provider}:${identity.provider_id}`)),
    },
    target: {
      managedAuthUsers: managedUsers.length,
      verifiedSourceMappings: mappedLegacy.filter(link => link.status === "verified").length,
      duplicateLegacyMappings: duplicateCount(links.map(link => link.legacy_user_id)),
      duplicateManagedSubjects: duplicateCount(links.map(link => link.neon_auth_user_id)),
      syntheticStagingMappings: links.length - mappedLegacy.length,
    },
    unresolved: {
      sourceUsersWithoutVerifiedMapping: users.length - mappedLegacy.filter(link => link.status === "verified").length,
      passwordHashImport: "NOT VERIFIED FOR CURRENT NEON MANAGED AUTH",
      googleProviderImport: "NOT VERIFIED FOR CURRENT NEON MANAGED AUTH",
      sessions: "WILL REQUIRE REAUTHENTICATION; NOT IMPORTED",
    },
  };
  console.log(JSON.stringify(report, null, 2));
  await source.query("ROLLBACK");
} catch (error) {
  await source.query("ROLLBACK").catch(() => undefined);
  console.error("Identity reconciliation dry run failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  await source.end().catch(() => undefined);
  await target.end().catch(() => undefined);
}
