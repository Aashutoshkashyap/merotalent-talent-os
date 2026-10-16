import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { createNeonAdminEventChild, deleteNeonAdminResource, listNeonAdminEventChildren, listNeonAdminResource, neonAdminOptions,
  readNeonAdminResource, saveNeonAdminResource } from "@/lib/server/neon-admin-resources";

describe("isolated Neon generic Super Admin content management",()=>{
  it("publishes and modifies real schema records, scopes owners, preserves references, and audits soft deletes inside rollback",async()=>{
    const parsed=dotenv.config({path:".migration.env",quiet:true}).parsed??{};
    if(!parsed.NEON_STAGING_DATABASE_URL)throw new Error("Isolated staging credentials are required.");
    Object.assign(process.env,parsed,{MEROTALENT_BACKEND_MODE:"neon-staging",NEON_STAGING_BRANCH_ID:NEON_MIGRATION_STAGING_BRANCH_ID});
    getNeonDatabaseConfig();
    const client=await getPool().connect();
    try{
      await client.query("BEGIN");
      const identity=(await client.query<{legacy_user_id:string;neon_auth_user_id:string}>(`SELECT a.legacy_user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active' AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor:NeonActor={userId:identity.legacy_user_id,neonAuthUserId:identity.neon_auth_user_id,roles:["super_admin"],permissions:[],platformAdmin:true};
      await client.query(`INSERT INTO public.user_roles(user_id,role) SELECT $1::uuid,'super_admin' WHERE NOT EXISTS
        (SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`,[actor.userId]);
      const query=<T extends QueryResultRow>(sql:string,params:readonly unknown[])=>(client.query<T>(sql,[...params])).then(result=>result.rows);
      const run=<T>(operation:(connection:PoolClient)=>Promise<T>)=>operation(client);
      await expect(listNeonAdminResource({...actor,neonAuthUserId:randomUUID()},"colleges",new URLSearchParams(),query)).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
      const suffix=randomUUID();
      const companyOwner=randomUUID();
      await client.query(`INSERT INTO public.profiles(user_id,email,full_name,account_status)
        VALUES($1::uuid,$2,'Isolated company owner','active')`,[companyOwner,`company-${suffix}@example.test`]);
      const company=await saveNeonAdminResource(actor,"companies",{user_id:companyOwner,name:`Staging employer ${suffix}`,size:"11-50",is_verified:true,
        website:"https://example.test",logo_url:"https://example.test/logo.png"},undefined,run);
      expect(company).toMatchObject({user_id:companyOwner,name:`Staging employer ${suffix}`,is_verified:true});
      expect(await saveNeonAdminResource(actor,"companies",{is_verified:false,description:"Edited employer"},String(company.id),run))
        .toMatchObject({is_verified:false,description:"Edited employer",logo_url:"https://example.test/logo.png"});
      await expect(saveNeonAdminResource(actor,"companies",{user_id:actor.userId},String(company.id),run)).rejects.toMatchObject({name:"AdminResourceValidationError"});
      await client.query(`UPDATE public.profiles SET account_status='suspended' WHERE user_id=$1::uuid`,[companyOwner]);
      await expect(saveNeonAdminResource(actor,"companies",{description:"Denied inactive owner"},String(company.id),run)).rejects.toMatchObject({name:"AdminResourceValidationError"});
      await client.query(`UPDATE public.profiles SET account_status='active' WHERE user_id=$1::uuid`,[companyOwner]);
      const college=await saveNeonAdminResource(actor,"colleges",{name:`Staging institute ${suffix}`,institution_category:"college",status:"approved",applications_enabled:true,
        courses_offered:["Engineering"],contact_info:{chairperson_message:"Staging text"},total_seats:20,available_seats:10,logo_url:"https://example.com/imported.png"},undefined,run);
      expect(college).toMatchObject({status:"approved",payment_verified:false,courses_offered:["Engineering"],logo_url:"https://example.com/imported.png"});
      const publicCollege=await client.query(`SELECT id FROM public.institute_directory WHERE id=$1::uuid`,[college.id]);
      expect(publicCollege.rowCount).toBe(1);
      const revised=await saveNeonAdminResource(actor,"colleges",{is_featured:true,ranking:1},String(college.id),run);
      expect(revised.logo_url).toBe("https://example.com/imported.png");
      expect(revised).toMatchObject({ranking:1,is_featured:true});
      await expect(saveNeonAdminResource(actor,"colleges",{total_seats:1,available_seats:2},String(college.id),run)).rejects.toMatchObject({name:"AdminResourceValidationError"});
      await expect(saveNeonAdminResource(actor,"colleges",{logo_url:`${actor.userId}/college_logo/${randomUUID()}/${randomUUID()}.png`},String(college.id),run)).rejects.toMatchObject({name:"AdminResourceValidationError"});
      const job=await saveNeonAdminResource(actor,"jobs",{owner_user_id:actor.userId,title:`Staging job ${suffix}`,status:"published",skills_required:["TypeScript"],requirements:["Test"]},undefined,run);
      expect(job).toMatchObject({status:"published",approval_status:"approved",is_active:true,approved_by:actor.userId});
      await expect(saveNeonAdminResource(actor,"jobs",{salary_min:100,salary_max:99},String(job.id),run)).rejects.toMatchObject({name:"AdminResourceValidationError"});
      const start=new Date(Date.now()+86400000).toISOString();
      const end=new Date(Date.now()+172800000).toISOString();
      const advertisement=await saveNeonAdminResource(actor,"advertisements",{title:`Staging campaign ${suffix}`,placement:"homepage",image_url:"https://example.test/banner.png",
        start_date:start,end_date:end,priority:2,status:"scheduled",destination_url:"https://example.test"},undefined,run);
      expect(advertisement).toMatchObject({is_active:true,status:"scheduled",target_url:"https://example.test",created_by:actor.userId});
      await expect(saveNeonAdminResource(actor,"advertisements",{end_date:new Date(Date.now()-86400000).toISOString()},String(advertisement.id),run)).rejects.toMatchObject({name:"AdminResourceValidationError"});
      expect(await saveNeonAdminResource(actor,"advertisements",{status:"paused"},String(advertisement.id),run)).toMatchObject({is_active:false,status:"paused"});
      await deleteNeonAdminResource(actor,"advertisements",String(advertisement.id),run);
      await expect(readNeonAdminResource(actor,"advertisements",String(advertisement.id),query)).rejects.toMatchObject({code:"RECORD_NOT_FOUND"});
      const event=await saveNeonAdminResource(actor,"events",{organizer_user_id:actor.userId,title:`Staging event ${suffix}`,start_date:start,end_date:end,
        status:"published",lifecycle_status:"published",is_multi_program:true,terms_and_conditions:"Staging terms",registration_open_at:null,registration_close_at:null},undefined,run);
      expect(event).toMatchObject({approval_status:"approved",is_active:true,is_multi_program:true,terms_and_conditions:"Staging terms"});
      const program=await createNeonAdminEventChild(actor,String(event.id),"programs",{title:"Staging session",start_time:start,end_time:end,venue:"Kathmandu",capacity:10,speaker_or_organizer:null},run);
      expect((await listNeonAdminEventChildren(actor,String(event.id),"programs",query)).some(row=>row.id===program.id)).toBe(true);
      const ticket=await createNeonAdminEventChild(actor,String(event.id),"tickets",{name:"Individual",ticket_kind:"individual",price:0,currency:"NPR",total_quantity:10,
        min_team_size:1,max_team_size:1,min_per_order:1,max_per_order:2,is_active:true},run);
      expect(ticket.price).toBe("0.00");
      await expect(listNeonAdminEventChildren(actor,String(event.id),"registrations",query)).resolves.toEqual([]);
      for(const kind of ["owners","companies","mentors","event-categories"])await expect(neonAdminOptions(actor,kind,query)).resolves.toBeInstanceOf(Array);
      for(const resource of ["users","user-roles","user-permissions","colleges","companies","mentors","partnered-courses","jobs","job-applications","events","event-registrations","college-applications","mentor-bookings","leads","access-requests","packages","subscriptions","payments","advertisements","featured-items","notifications"] as const)
        await expect(listNeonAdminResource(actor,resource,new URLSearchParams(),query)).resolves.toMatchObject({data:expect.any(Array)});
      expect((await readNeonAdminResource(actor,"jobs",String(job.id),query)).title).toBe(job.title);
      await deleteNeonAdminResource(actor,"companies",String(company.id),run);
      await expect(readNeonAdminResource(actor,"companies",String(company.id),query)).rejects.toMatchObject({code:"RECORD_NOT_FOUND"});
      await deleteNeonAdminResource(actor,"colleges",String(college.id),run);
      expect((await client.query(`SELECT id FROM public.institute_directory WHERE id=$1::uuid`,[college.id])).rowCount).toBe(0);
      await expect(readNeonAdminResource(actor,"colleges",String(college.id),query)).rejects.toMatchObject({code:"RECORD_NOT_FOUND"});
      const audit=await client.query(`SELECT action FROM public.audit_logs WHERE actor_user_id=$1::uuid AND entity_id=ANY($2::text[])`,[actor.userId,[college.id,job.id,event.id,program.id,ticket.id]]);
      expect(audit.rowCount).toBeGreaterThanOrEqual(6);
    }finally{await client.query("ROLLBACK").catch(()=>undefined);client.release();await getPool().end();}
  },60000);
});
