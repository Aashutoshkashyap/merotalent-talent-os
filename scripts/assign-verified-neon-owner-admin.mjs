/** Explicit owner-authorized staging bootstrap, never an email-only identity link. */
import dotenv from "dotenv";
import pg from "pg";
import { createHash } from "node:crypto";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { productionCandidateUrl } from './production-candidate-boundary.mjs';

dotenv.config({ path: ".migration.env", quiet: true });
const production=process.argv.includes('--production-candidate');
const apply = process.argv.includes(production?'--apply-production-owner-approved-20261020':"--apply-owner-approved-20261020");
if(production&&process.argv.includes('--apply-owner-approved-20261020'))throw new Error('PRODUCTION_APPROVAL_FLAG_REQUIRED');
const snapshotPath = process.argv.find(arg => arg.startsWith("--snapshot="))?.slice(11);
const ownerEmail = process.argv.find(arg => arg.startsWith("--owner-email="))?.slice(14).trim().toLowerCase();
if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error("EXPLICIT_OWNER_EMAIL_REQUIRED");
const source = await readEncryptedSourceSnapshot(snapshotPath);
const expected = source.auth.users.map(JSON.parse).filter(row => row.email?.toLowerCase() === ownerEmail);
if (expected.length !== 1 || !expected[0].email_confirmed_at) throw new Error("VERIFIED_SOURCE_OWNER_REQUIRED");
const url = production?productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL):new URL(process.env.NEON_STAGING_DATABASE_URL);
if(!production)requireNeonMigrationStaging(url.href);
url.searchParams.set("sslmode", "verify-full");
const client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 15000, query_timeout: 30000 });
const approval = "direct-user-confirmation:2026-10-20:verified-owner-super-admin";
let phase = "identity_check";
try {
  await client.connect(); await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  await client.query("SET LOCAL statement_timeout='30s'");
  const owners = (await client.query(`SELECT p.user_id FROM public.profiles p
    JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id
    JOIN public.neon_identity_links l ON l.application_account_id=a.id
    JOIN neon_auth."user" u ON u.id::uuid=l.neon_auth_user_id
    WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
      AND a.status='active' AND l.status='verified'
      AND l.verification_method='dual_authenticated_session' AND l.verified_at IS NOT NULL
      AND u."emailVerified"=true AND lower(u.email)=$2
    FOR UPDATE OF p,a,l`, [expected[0].id, ownerEmail])).rows;
  if (owners.length !== 1) throw new Error("DUAL_SESSION_VERIFIED_OWNER_REQUIRED");
  const id = owners[0].user_id;
  const grants = async () => {
    const result = [];
    for (const table of ["user_module_capabilities", "entity_admin_assignments", "entity_feature_grants"]) {
      result.push((await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${table} t WHERE user_id=$1::uuid ORDER BY to_jsonb(t)::text`, [id])).rows);
    }
    return result;
  };
  const before = JSON.stringify(await grants());
  const rolesBefore = (await client.query("SELECT role::text AS role FROM public.user_roles WHERE user_id=$1::uuid ORDER BY role", [id])).rows.map(row => row.role);
  let created = 0;
  if (apply) {
    phase = "role_insert";
    if (!rolesBefore.some(role => ["admin", "super_admin"].includes(role))) {
      // The existing one-primary-role invariant forbids adding an admin row
      // alongside talent. Preserve the row ID and audit the authorized transition.
      if (rolesBefore.length !== 1 || rolesBefore[0] !== "talent") throw new Error("UNEXPECTED_OWNER_PRIMARY_ROLE");
      created = (await client.query("UPDATE public.user_roles SET role='admin' WHERE user_id=$1::uuid AND role='talent'", [id])).rowCount;
      if (created !== 1) throw new Error("OWNER_ROLE_TRANSITION_FAILED");
    }
    phase = "audit_insert";
    if (created) await client.query(`INSERT INTO public.audit_logs(action,entity_type,entity_id,metadata)
      VALUES('grant_platform_admin','user',$1,$2::jsonb)`, [id, JSON.stringify({ approval_reference: approval,
        identity_proof: "existing_dual_authenticated_session", new_assignment_not_source_grant: true,
        previous_primary_roles: rolesBefore, new_primary_role: "admin", original_role_row_id_preserved: true,
        environment: production?'neon-production-candidate':"neon-staging", operator_action: true })]);
  }
  if (JSON.stringify(await grants()) !== before) throw new Error("UNRELATED_GRANT_CHANGED");
  const rolesAfter = (await client.query("SELECT role::text AS role FROM public.user_roles WHERE user_id=$1::uuid ORDER BY role", [id])).rows.map(row => row.role);
  if ((apply && !rolesAfter.some(role => ["admin", "super_admin"].includes(role))) || rolesAfter.length !== rolesBefore.length) throw new Error("ROLE_INVARIANT_FAILED");
  await client.query(apply ? "COMMIT" : "ROLLBACK");
  console.log(JSON.stringify({ result: "PASS", mode: apply ? "APPLY" : "DRY_RUN", primaryRoleChanges: created,
    ownerFingerprint: createHash("sha256").update(id).digest("hex").slice(0,16), approval,
    originalRoleTransitionAudited: created > 0, capabilityEntityAndFeatureGrantsUnchanged: true,
    identityLinksChanged: false, qaAccountChanged: false, sourceWrites: 0, productionWrites: production&&apply?created:0 }));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error(JSON.stringify({ result: "FAIL", phase, code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : error.code ?? "OWNER_ASSIGNMENT_FAILED",
    detail: String(error.message).replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi,"[ID]").slice(0,220) }));
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }
