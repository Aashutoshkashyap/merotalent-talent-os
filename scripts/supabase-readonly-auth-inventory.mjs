/** Bounded source Auth inventory through Supabase's explicitly read-only API. No writes or secrets in output. */
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery as readOnly, sourceProjectRef as projectRef } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);

const target = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL,
  connectionTimeoutMillis: 10000 });
try {
  const sourceUsers = await readOnly(`SELECT id::text AS id,lower(email) AS email
    FROM auth.users ORDER BY id`);
  const sourceIdentityCount = await readOnly(`SELECT count(*)::int AS n FROM auth.identities`);
  const privilegedSource = await readOnly(`SELECT lower(u.email) AS email FROM auth.users u
    WHERE lower(u.email) NOT LIKE 'qa%'
      AND (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id
        AND r.role::text <> 'talent')
        OR EXISTS (SELECT 1 FROM public.user_module_capabilities c WHERE c.user_id=u.id
          AND c.status='active')
        OR EXISTS (SELECT 1 FROM public.entity_admin_assignments a WHERE a.user_id=u.id
          AND a.status='active')) ORDER BY email`);
  await target.connect();
  const profiles = (await target.query(`SELECT user_id::text AS id,lower(email) AS email
    FROM public.profiles`)).rows;
  const links = (await target.query(`SELECT a.legacy_user_id::text AS id
    FROM public.neon_application_accounts a JOIN public.neon_identity_links l
      ON l.application_account_id=a.id WHERE l.status='verified'`)).rows;
  const sourceIds = new Set(sourceUsers.map(row => row.id));
  const profileIds = new Set(profiles.map(row => row.id));
  const linkIds = new Set(links.map(row => row.id));
  const qa = sourceUsers.filter(row => row.email?.startsWith("qa"));
  console.log(JSON.stringify({ mode: "READ_ONLY_INVENTORY", sourceProject: projectRef,
    sourceAuthUsers: sourceUsers.length, sourceAuthIdentities: Number(sourceIdentityCount[0]?.n ?? 0),
    sourceQaEmails: qa.map(row => row.email).sort(),
    sourceNonQaUsers: sourceUsers.length - qa.length,
    nonQaAccountsWithAdministrativeAccess: privilegedSource.map(row => row.email),
    targetProfiles: profiles.length,
    sourceIdsMissingFromTargetProfiles: sourceUsers.filter(row => !profileIds.has(row.id)).length,
    targetProfileIdsMissingFromSource: profiles.filter(row => !sourceIds.has(row.id)).length,
    sourceUsersWithVerifiedNeonLink: sourceUsers.filter(row => linkIds.has(row.id)).length,
  }));
} catch (error) {
  console.error("Read-only Auth inventory failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  await target.end().catch(() => undefined);
}
