/** One explicitly approved candidate role change; never a generic conflict override. */
import {createHash} from 'node:crypto';
import {tableFingerprintsBatched} from './recovery-integrity.mjs';
import {canonicalSnapshotValue} from './source-snapshot-reconciliation.mjs';

const ownerEmail='jhaaashutosh933@gmail.com';
const approval='direct-user-confirmation:2026-10-20:verified-owner-super-admin';
export async function verifiedCandidateOwnerLedger(client,source){
  const owners=source.auth.users.map(JSON.parse).filter(row=>row.email?.toLowerCase()===ownerEmail&&row.email_confirmed_at);
  if(owners.length!==1)throw Error('APPROVED_SOURCE_OWNER_REQUIRED');
  const ownerId=owners[0].id;
  const counts=(await client.query(`SELECT (SELECT count(*)::int FROM neon_auth."user") AS users,
    (SELECT count(*)::int FROM public.neon_identity_links) AS links,
    (SELECT count(*)::int FROM public.neon_application_accounts) AS accounts`)).rows[0];
  if(counts.users!==1||counts.links!==1||counts.accounts!==1)throw Error('UNREVIEWED_CANDIDATE_IDENTITIES');
  const verified=(await client.query(`SELECT a.legacy_user_id FROM public.neon_application_accounts a
    JOIN public.neon_identity_links l ON l.application_account_id=a.id
    JOIN neon_auth."user" u ON u.id::uuid=l.neon_auth_user_id
    JOIN public.profiles p ON p.user_id=a.legacy_user_id
    WHERE a.legacy_user_id=$1::uuid AND a.status='active' AND l.status='verified'
      AND l.verification_method='dual_authenticated_session' AND l.verified_at IS NOT NULL
      AND u."emailVerified"=true AND lower(u.email)=$2
      AND p.account_status='active' AND p.deleted_at IS NULL
      AND (SELECT count(*) FROM public.user_roles r WHERE r.user_id=a.legacy_user_id)=1
      AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=a.legacy_user_id AND r.role::text='admin')
      AND (SELECT count(*) FROM public.audit_logs x WHERE x.entity_id=a.legacy_user_id::text
        AND x.action='grant_platform_admin' AND x.metadata->>'environment'='neon-production-candidate'
        AND x.metadata->>'approval_reference'=$3)=1`,[ownerId,ownerEmail,approval])).rows;
  if(verified.length!==1)throw Error('VERIFIED_APPROVED_CANDIDATE_OWNER_REQUIRED');
  const all=await tableFingerprintsBatched(client);
  // Existing source-table grants are independently protected by append-only row
  // comparisons. New source users/roles may be appended without changing Auth.
  const protectedTables=all.filter(row=>row.schema==='neon_auth'||['neon_application_accounts','neon_identity_links'].includes(row.name));
  if(!protectedTables.length)throw Error('IDENTITY_FINGERPRINT_REQUIRED');
  return {ownerId,hash:createHash('sha256').update(canonicalSnapshotValue(protectedTables)).digest('hex')};
}

/** Desired source remains unchanged except the exact row of the approved Talent→admin grant. */
export function preserveApprovedOwnerRole({table,sourceRows,targetRows,ownerId}){
  if(table!=='user_roles')return {rows:sourceRows,approvedExceptions:0};
  const source=sourceRows.map(JSON.parse),target=targetRows.map(JSON.parse);
  const s=source.filter(row=>row.user_id===ownerId),t=target.filter(row=>row.user_id===ownerId);
  if(s.length!==1||t.length!==1||s[0].role!=='talent'||t[0].role!=='admin'||s[0].id!==t[0].id)throw Error('UNREVIEWED_OWNER_ROLE_CONFLICT');
  const nonRole=row=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='role'));
  if(canonicalSnapshotValue(nonRole(s[0]))!==canonicalSnapshotValue(nonRole(t[0])))throw Error('UNREVIEWED_OWNER_ROLE_FIELDS');
  return {rows:sourceRows.map(raw=>JSON.parse(raw).id===s[0].id?JSON.stringify({...JSON.parse(raw),role:'admin'}):raw),approvedExceptions:1};
}
