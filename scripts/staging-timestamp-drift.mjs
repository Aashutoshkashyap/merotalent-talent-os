/** Narrow proof of the historical node-postgres Date conversion; never heuristically rounds target values. */
import { createHash } from "node:crypto";
import pg from "pg";
import { canonicalSnapshotValue,snapshotFingerprint } from "./source-snapshot-reconciliation.mjs";
import { parseLosslessSnapshotRow } from "./lossless-snapshot-json.mjs";
import { exactTimestampInstant } from "./staging-snapshot-delta.mjs";
export const rowHash=raw=>createHash("sha256").update(canonicalSnapshotValue(parseLosslessSnapshotRow(raw))).digest("hex");
export const evidenceHash=value=>createHash("sha256").update(canonicalSnapshotValue(value)).digest("hex");
const same=(a,b)=>canonicalSnapshotValue(a)===canonicalSnapshotValue(b);
export function classifyTimestampDrift({baseline,source,target,keys,columns}) {
  const b=parseLosslessSnapshotRow(baseline),s=parseLosslessSnapshotRow(source),t=parseLosslessSnapshotRow(target);
  const fields=Object.keys(s).filter(k=>!same(s[k],t[k]));
  const row=snapshotFingerprint(canonicalSnapshotValue(keys.map(k=>s[k])));
  const details=fields.map(field=>{
    const type=columns.find(c=>c.column_name===field);
    let reason="INDEPENDENT_OR_UNPROVEN_CHANGE";
    if(type?.udt_schema==="pg_catalog"&&type.udt_name==="timestamptz"&&typeof s[field]==="string"&&typeof t[field]==="string") {
      const parsed=pg.types.getTypeParser(1184,"text")(s[field].replace("T"," "));
      if(parsed instanceof Date&&Number.isFinite(parsed.getTime())&&same(b[field],s[field])&&
        exactTimestampInstant(parsed.toISOString())===exactTimestampInstant(t[field])&&
        exactTimestampInstant(s[field])!==exactTimestampInstant(t[field]))reason="PG_DATE_MICROSECOND_TRUNCATION";
      else if(exactTimestampInstant(s[field])===exactTimestampInstant(t[field]))reason="EQUIVALENT_TIMESTAMP_REPRESENTATION";
    }
    return {field,reason,sourceType:type?.udt_name??"unknown",sourcePrecision:type?.datetime_precision??null};
  });
  const repairFields=details.filter(d=>d.reason==="PG_DATE_MICROSECOND_TRUNCATION").map(d=>d.field);
  const proven=repairFields.length>0&&details.every(d=>["PG_DATE_MICROSECOND_TRUNCATION","EQUIVALENT_TIMESTAMP_REPRESENTATION"].includes(d.reason))&&repairFields.every(f=>!keys.includes(f));
  return {row,classification:!fields.length?"EXACT":proven?"PROVEN_IMPORT_PRECISION_LOSS":"RETAIN_UNRESOLVED",fields:details,
    sourceHash:rowHash(source),beforeHash:rowHash(target),sourceOrigin:true,syntheticStatus:"SOURCE_PRESENT_NOT_TARGET_ONLY",
    repairFields:proven?repairFields:[]};
}

/** Only a reviewed timestamp mutator may be suspended, transactionally and by exact trigger name. */
export function isPureTimestampTrigger(trigger) {
  return trigger.function_schema==="public"&&["update_updated_at_column","update_page_sections_timestamp"].includes(trigger.function_name)&&
    trigger.language==="plpgsql"&&/^BEGIN NEW\.updated_at\s*(?:=|:=)\s*(?:now\(\)|CURRENT_TIMESTAMP); RETURN NEW; END;?$/i.test(trigger.body.replace(/\s+/g," ").trim())&&
    (trigger.type&16)!==0;
}

/** Reviewed guards remain enabled. Repair statements change only timestamps, never their watched role/status fields. */
export function isUnchangedFieldGuard(trigger) {
  const reviewed={protect_last_admin_role:"f9a07252b21e418b324e54b129aae3fcc9185571098e92f1f2b6343fbd3dab01",sync_payment_result:"3a3914fd467b178e8c928327a21b98219a1971f340930ec7e54d8fa004d462be",release_failed_paid_reservations:"c554fa3cec40ba0537878416ae6425a407a9007393a10d81c745eceaed4888e6"};
  return trigger.function_schema==="public"&&trigger.language==="plpgsql"&&Object.hasOwn(reviewed,trigger.function_name)&&
    createHash("sha256").update(trigger.body.replace(/\s+/g," ").trim()).digest("hex")===reviewed[trigger.function_name];
}

/** PostgreSQL UPDATE OF triggers do not run when none of their named columns is assigned. */
export function isColumnDisjointTrigger(trigger,repairColumns) {
  return Array.isArray(trigger.update_columns)&&trigger.update_columns.length>0&&
    trigger.update_columns.every(c=>!repairColumns.includes(c));
}

/** Restore only an imported creation date beside a separately audited contact-replay update time. */
export function auditedProfileCreationRepair(proof,approvedSnapshotAuditEvents) {
  return approvedSnapshotAuditEvents>0&&proof.classification==="RETAIN_UNRESOLVED"&&proof.fields.length===2&&
    proof.fields.some(f=>f.field==="created_at"&&f.reason==="PG_DATE_MICROSECOND_TRUNCATION")&&
    proof.fields.some(f=>f.field==="updated_at"&&f.reason==="INDEPENDENT_OR_UNPROVEN_CHANGE");
}

export function precisionRepairPlan({plan,baseline,source,target,keys,columns}) {
  const index=rows=>{
    const result=new Map();
    for(const raw of rows){const value=parseLosslessSnapshotRow(raw),key=snapshotFingerprint(canonicalSnapshotValue(keys.map(k=>value[k])));if(result.has(key))throw new Error("OPAQUE_KEY_COLLISION");result.set(key,raw);}
    return result;
  };
  const b=index(baseline),s=index(source),t=index(target),ledger=[],operations=[];
  for(const conflict of plan.conflicts) {
    if(!b.has(conflict.row)||!s.has(conflict.row)||!t.has(conflict.row)) {
      ledger.push({table:plan.table,...conflict,classification:"RETAIN_UNRESOLVED"});continue;
    }
    const proof=classifyTimestampDrift({baseline:b.get(conflict.row),source:s.get(conflict.row),target:t.get(conflict.row),keys,columns});
    ledger.push({table:plan.table,...proof});
    if(proof.repairFields.length)operations.push({kind:"timestamp-repair",row:proof.row,raw:s.get(conflict.row),beforeRaw:t.get(conflict.row),columns:proof.repairFields});
  }
  return {ledger,operations};
}

export async function retainedConflictProvenance(client,plans,rowsByTable,keysByTable,approvedSnapshots) {
  const result=[];
  for(const plan of plans)for(const conflict of plan.conflicts) {
    if(!["profiles","provider_configurations"].includes(plan.table))continue;
    const keys=keysByTable.get(plan.table).pk;
    const row=rowsByTable.get(plan.table).map(parseLosslessSnapshotRow).find(r=>snapshotFingerprint(canonicalSnapshotValue(keys.map(k=>r[k])))===conflict.row);
    if(!row)throw new Error("RETAINED_CONFLICT_ROW_MISSING");
    if(plan.table==="profiles") {
      const audit=(await client.query(`SELECT count(*)::int AS n FROM public.audit_logs WHERE action='migration_source_profile_contact_delta' AND entity_id::text=$1::text
        AND metadata->>'source_snapshot_sha256'=ANY($2::text[])`,[row.id,approvedSnapshots])).rows[0].n;
      const dependencies=(await client.query(`SELECT (SELECT count(*)::int FROM public.user_roles WHERE user_id=$1::uuid) AS roles,
        (SELECT count(*)::int FROM public.user_module_capabilities WHERE user_id=$1::uuid) AS capabilities,
        (SELECT count(*)::int FROM public.entity_admin_assignments WHERE user_id=$1::uuid) AS assignments`,[row.user_id])).rows[0];
      result.push({table:plan.table,row:conflict.row,action:"RETAIN_STAGING_EDIT",provenance:audit?"AUDITED_SOURCE_CONTACT_REPLAY_UPDATED_AT":"PROVENANCE_UNVERIFIED",approvedSnapshotAuditEvents:audit,dependencies,
        disposition:"Keep the audited staging update time; only observed field differences remain in the conflict ledger"});
    } else {
      const audit=(await client.query("SELECT count(*)::int AS n FROM public.audit_logs WHERE action='staging_configure_esewa_uat' AND entity_id='payment'")).rows[0].n;
      const uat=row.provider_kind==="payment"&&row.provider_name==="esewa"&&row.public_config?.environment==="uat"&&row.public_config?.merchant_code==="EPAYTEST";
      result.push({table:plan.table,row:conflict.row,action:"RETAIN_STAGING_EDIT",provenance:audit&&uat?"AUDITED_ESEWA_UAT_CONFIGURATION":"PROVENANCE_UNVERIFIED",auditEvents:audit,dependsOn:"staging payment provider configuration",
        disposition:"Retain encrypted sandbox configuration; never copy its credential or configuration into the production source"});
    }
  }
  return result;
}

/** A full target-row checksum, including extra columns, protects unrelated staging edits. */
export function expectedRepairedTableFingerprint(rows,operations,keys) {
  const operationsById=new Map(operations.map(o=>[o.row,o]));
  const result=rows.map(raw=>{
    const value=parseLosslessSnapshotRow(raw),id=snapshotFingerprint(canonicalSnapshotValue(keys.map(k=>value[k])));
    const operation=operationsById.get(id);
    if(operation){const source=parseLosslessSnapshotRow(operation.raw);for(const field of operation.columns)value[field]=source[field];}
    return canonicalSnapshotValue(value);
  }).sort();
  return evidenceHash(result);
}
