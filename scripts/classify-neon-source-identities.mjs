/** Read-only, pseudonymous identity classification. Email matching never grants access. */
import { createHash } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery, sourceProjectRef } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
const target = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: 15000 });
const fingerprint = value => createHash("sha256").update(value).digest("hex").slice(0, 16);

try {
  const sourceUsers = await sourceReadOnlyQuery(`SELECT u.id::text AS id,lower(u.email) AS email,
    (SELECT count(*)::int FROM auth.identities i WHERE i.user_id=u.id) AS identity_count,
    (SELECT count(*)::int FROM public.profiles p WHERE p.user_id=u.id) AS profile_count,
    (SELECT count(*)::int FROM public.user_roles r WHERE r.user_id=u.id
      AND r.role::text <> 'talent') AS admin_role_count,
    (SELECT count(*)::int FROM public.user_module_capabilities c WHERE c.user_id=u.id
      AND c.status='active') AS capability_count,
    (SELECT count(*)::int FROM public.entity_admin_assignments a WHERE a.user_id=u.id
      AND a.status='active') AS assignment_count
    FROM auth.users u ORDER BY u.id`);
  await target.connect();
  const targetUsers = (await target.query(`SELECT a.legacy_user_id::text AS id,
    count(DISTINCT a.id)::int AS account_count,
    count(DISTINCT l.neon_auth_user_id) FILTER (WHERE l.status='verified')::int AS verified_link_count,
    count(DISTINCT p.user_id)::int AS profile_count
    FROM public.neon_application_accounts a
    LEFT JOIN public.neon_identity_links l ON l.application_account_id=a.id
    LEFT JOIN public.profiles p ON p.user_id=a.legacy_user_id
    GROUP BY a.legacy_user_id`)).rows;
  const byId = new Map(targetUsers.map(row => [row.id, row]));
  const accounts = sourceUsers.map(row => {
    const targetRow = byId.get(row.id);
    const qa = row.email?.startsWith("qa") && row.email?.endsWith("@merotalent.com");
    const admin = Number(row.admin_role_count) + Number(row.capability_count) + Number(row.assignment_count) > 0;
    const category = qa ? "required_qa" : admin ? "legitimate_admin_preserve" : "unresolved_preserve";
    return { account: fingerprint(row.id), category,
      sourceIdentityCount: Number(row.identity_count), sourceProfile: Number(row.profile_count) === 1,
      targetProfile: Number(targetRow?.profile_count ?? 0) === 1,
      targetApplicationAccount: Number(targetRow?.account_count ?? 0) === 1,
      verifiedNeonLink: Number(targetRow?.verified_link_count ?? 0) === 1,
      adminRoles: Number(row.admin_role_count), activeCapabilities: Number(row.capability_count),
      activeAssignments: Number(row.assignment_count) };
  });
  const summary = {
    sourceUsers: accounts.length, categories: Object.fromEntries(
      [...new Set(accounts.map(row => row.category))].map(category =>
        [category, accounts.filter(row => row.category === category).length])),
    sourceUsersMissingTargetAccount: accounts.filter(row => !row.targetApplicationAccount).length,
    sourceUsersWithVerifiedNeonLink: accounts.filter(row => row.verifiedNeonLink).length,
    accountsWithoutSourceAuthIdentity: accounts.filter(row => row.sourceIdentityCount === 0).length,
  };
  console.log(JSON.stringify({ mode: "READ_ONLY_PSEUDONYMOUS_IDENTITY_CLASSIFICATION",
    sourceProject: sourceProjectRef, targetBranch: process.env.NEON_STAGING_BRANCH_ID,
    rule: "Unlinked or email-matched accounts are never classified disposable or granted access",
    summary, accounts }));
} catch (error) {
  console.error("Identity classification stopped:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally { await target.end().catch(() => undefined); }
