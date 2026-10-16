/** Neon platform reports use the established export schema and preserve applicant privacy. */
import type { QueryResultRow } from "pg";
import { getAdminReport, type AdminReportName } from "@/lib/admin/admin-reports";
import type { AdminReportQuery, AdminReportRow } from "@/lib/admin/admin-report-service";
import { queryRows } from "./db";
import { requireSuperAdmin, NeonAuthorizationError, type NeonActor, type NeonQueryExecutor } from "./neon-authorization";

const adminGuard=`EXISTS(SELECT 1 FROM public.profiles p JOIN public.user_roles r ON r.user_id=p.user_id
  JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
  JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
  WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
    AND r.role IN ('admin','super_admin') AND l.neon_auth_user_id=$2::uuid)`;
const identifier=(value:string)=>{
  if (!/^[a-z_]+$/.test(value)) throw new Error("Invalid internal report definition.");
  return `"${value}"`;
};
const nextDate=(date:string)=>{const value=new Date(`${date}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+1);return value.toISOString().slice(0,10);};

export async function loadNeonAdminReport(actor:NeonActor,report:AdminReportName,options:AdminReportQuery,
  db:NeonQueryExecutor={query:queryRows}):Promise<AdminReportRow[]> {
  requireSuperAdmin(actor);
  const definition=getAdminReport(report);
  let rowQuery:string;
  if(report === "applications") {
    rowQuery=`SELECT application_type,applicant_name,email,phone,target_name,program_or_position,intake,status,submitted_at FROM (
      SELECT 'College application' AS application_type,
        COALESCE(NULLIF(btrim(c.full_name),''),NULLIF(btrim(p.full_name),''),'Guest applicant') AS applicant_name,
        COALESCE(NULLIF(btrim(c.email),''),p.email,'') AS email,COALESCE(NULLIF(btrim(c.phone),''),p.phone,'') AS phone,
        COALESCE(i.name,'College record unavailable') AS target_name,COALESCE(c.program_interest,'') AS program_or_position,
        COALESCE(c.intake,'') AS intake,c.status,c.submitted_at
      FROM public.college_applications c LEFT JOIN public.profiles p ON p.user_id=c.applicant_id
      LEFT JOIN public.institutes i ON i.id=c.institute_id WHERE c.deleted_at IS NULL
      UNION ALL
      SELECT 'Job application',COALESCE(NULLIF(btrim(j.full_name),''),NULLIF(btrim(p.full_name),''),'Applicant'),
        COALESCE(NULLIF(btrim(j.email),''),p.email,''),COALESCE(NULLIF(btrim(j.phone),''),p.phone,''),
        COALESCE(job.title,'Job record unavailable'),COALESCE(job.title,''),'',j.status,j.applied_at
      FROM public.job_applications j LEFT JOIN public.profiles p ON p.user_id=j.user_id
      LEFT JOIN public.jobs job ON job.id=j.job_id WHERE j.deleted_at IS NULL
    ) application_rows WHERE (SELECT allowed FROM access)
      AND ($3::date IS NULL OR submitted_at >= $3::date) AND ($4::date IS NULL OR submitted_at < $4::date)
    ORDER BY submitted_at DESC LIMIT $5 OFFSET $6`;
  } else {
    const columns=definition.select.split(",").map(identifier).join(",");
    const date=identifier(definition.dateColumn);
    rowQuery=`SELECT ${columns} FROM public.${identifier(definition.table)}
      WHERE (SELECT allowed FROM access) AND deleted_at IS NULL
        AND ($3::date IS NULL OR ${date} >= $3::date) AND ($4::date IS NULL OR ${date} < $4::date)
        ${report === "revenue"?"AND status='success'":""}
      ORDER BY ${identifier(definition.orderColumn)} DESC LIMIT $5 OFFSET $6`;
  }
  const result=(await db.query<QueryResultRow & {allowed:boolean;rows:AdminReportRow[]}>(`
    WITH access AS (SELECT ${adminGuard} AS allowed)
    SELECT access.allowed,COALESCE((SELECT jsonb_agg(to_jsonb(report_rows)) FROM (${rowQuery}) report_rows),'[]'::jsonb) AS rows
    FROM access`,[actor.userId,actor.neonAuthUserId,options.from ?? null,options.to?nextDate(options.to):null,options.limit,options.offset]))[0];
  if(!result?.allowed) throw new NeonAuthorizationError(403,"ADMIN_REQUIRED","An active linked administrator is required.");
  return result.rows;
}
