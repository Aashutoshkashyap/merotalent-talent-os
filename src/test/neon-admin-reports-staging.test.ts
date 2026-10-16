import {describe,expect,it} from "vitest";
import dotenv from "dotenv";
import {getPool} from "@/lib/server/db";
import {loadNeonAdminReport} from "@/lib/server/neon-admin-reports";
import {ADMIN_REPORT_NAMES} from "@/lib/admin/admin-reports";
import {parseAdminReportQuery} from "@/lib/admin/admin-report-service";
import type {NeonActor,NeonQueryExecutor} from "@/lib/server/neon-authorization";
import {getNeonDatabaseConfig} from "@/lib/neon/neon-config";
import {listNeonAdministrators,loadNeonDirectoryProfiles} from "@/lib/server/neon-admin-directory";
describe("isolated Neon report queries",()=>{
  it("executes all report definitions with identity checks and safe applicant export fields",async()=>{
    Object.assign(process.env,dotenv.config({path:".migration.env",quiet:true}).parsed,{MEROTALENT_BACKEND_MODE:"neon-staging"});
    getNeonDatabaseConfig();const client=await getPool().connect();
    try{
      await client.query("BEGIN");
      const link=(await client.query(`SELECT a.legacy_user_id AS user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id
        WHERE l.status='verified' AND a.status='active' AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(link).toBeTruthy();
      await client.query(`INSERT INTO public.user_roles(user_id,role) VALUES ($1::uuid,'admin') ON CONFLICT(user_id,role) DO NOTHING`,[link.user_id]);
      const actor:NeonActor={userId:link.user_id,neonAuthUserId:link.neon_auth_user_id,roles:["admin"],permissions:[],platformAdmin:true};
      const db:NeonQueryExecutor={query:async(sql,params)=>(await client.query(sql,[...params])).rows};
      const options=parseAdminReportQuery(new URLSearchParams("limit=25"));
      for(const report of ADMIN_REPORT_NAMES){
        const rows=await loadNeonAdminReport(actor,report,options,db);expect(Array.isArray(rows)).toBe(true);expect(rows.length).toBeLessThanOrEqual(25);
        if(report === "applications")for(const row of rows){expect(row).toHaveProperty("applicant_name");expect(row).toHaveProperty("target_name");expect(row).not.toHaveProperty("applicant_id");}
      }
      await expect(loadNeonAdminReport({...actor,neonAuthUserId:"20000000-0000-4000-8000-000000000002"},"applications",options,db)).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
      const administrators=await listNeonAdministrators(actor,db);
      expect(administrators.some(row=>row.userId===actor.userId)).toBe(true);
      const directory=await loadNeonDirectoryProfiles(actor,[actor.userId],db);
      expect(directory[0].user_id).toBe(actor.userId);
      await expect(loadNeonDirectoryProfiles({...actor,neonAuthUserId:"20000000-0000-4000-8000-000000000002"},[actor.userId],db)).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
    }finally{await client.query("ROLLBACK").catch(()=>undefined);client.release();await getPool().end();}
  },60000);
});
