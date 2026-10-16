import dotenv from "dotenv";
import {describe,expect,it} from "vitest";
import type {PoolClient} from "pg";
import {randomUUID} from "node:crypto";
import {getPool} from "@/lib/server/db";
import {getNeonDatabaseConfig,NEON_MIGRATION_STAGING_BRANCH_ID} from "@/lib/neon/neon-config";
import type {NeonActor} from "@/lib/server/neon-authorization";
import {deleteNeonManagedMedia,downloadNeonManagedMedia,uploadNeonManagedMedia} from "@/lib/server/neon-managed-media";
import {deleteObject,headObject} from "@/lib/server/storage";
import {saveNeonAdminResource} from "@/lib/server/neon-admin-resources";

describe("isolated Neon listing media and private event files",()=>{
  it("verifies actual S3 bytes, exact references, missing/foreign deletion and cleanup, then rolls back fixture rows",async()=>{
    const parsed=dotenv.config({path:".migration.env",quiet:true}).parsed??{};
    if(!parsed.NEON_STAGING_DATABASE_URL)throw new Error("Staging credentials required.");
    Object.assign(process.env,parsed,{MEROTALENT_BACKEND_MODE:"neon-staging",NEON_STAGING_BRANCH_ID:NEON_MIGRATION_STAGING_BRANCH_ID});
    getNeonDatabaseConfig();
    const client=await getPool().connect();const objects:Array<{bucket:string;path:string}>=[];
    try{
      await client.query("BEGIN");
      const identity=(await client.query<{legacy_user_id:string;neon_auth_user_id:string}>(`SELECT a.legacy_user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active'
          AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor:NeonActor={userId:identity.legacy_user_id,neonAuthUserId:identity.neon_auth_user_id,roles:["super_admin"],permissions:[],platformAdmin:true};
      await client.query(`INSERT INTO public.user_roles(user_id,role) SELECT $1::uuid,'super_admin' WHERE NOT EXISTS
        (SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`,[actor.userId]);
      const run=<T>(operation:(connection:PoolClient)=>Promise<T>)=>operation(client);
      const start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+172800000).toISOString();
      const event=await saveNeonAdminResource(actor,"events",{organizer_user_id:actor.userId,title:`Isolated media fixture ${randomUUID()}`,start_date:start,end_date:end,status:"published"},undefined,run);
      const eventId=String(event.id);
      const png=Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5hcAAAAASUVORK5CYII=","base64"));
      const companyOwner=randomUUID();
      await client.query(`INSERT INTO public.profiles(user_id,email,full_name,account_status)
        VALUES($1::uuid,$2,'Isolated logo owner','active')`,[companyOwner,`logo-${companyOwner}@example.test`]);
      const company=await saveNeonAdminResource(actor,"companies",{user_id:companyOwner,name:`Isolated logo company ${companyOwner}`},undefined,run);
      const companyId=String(company.id);
      const logo=await uploadNeonManagedMedia(actor,{module:"company_logo",resourceId:companyId,fileName:"logo.png",contentType:"image/png",bytes:png},run);
      objects.push(logo);expect(logo.bucket).toBe("profile-media");
      expect(Buffer.from(await (await fetch(logo.publicUrl)).arrayBuffer()).equals(Buffer.from(png))).toBe(true);
      expect(await saveNeonAdminResource(actor,"companies",{logo_url:logo.path},companyId,run)).toMatchObject({logo_url:logo.path});
      await expect(deleteNeonManagedMedia(actor,{module:"company_logo",resourceId:companyId,path:logo.path},run)).rejects.toMatchObject({code:"MEDIA_STILL_REFERENCED"});
      await saveNeonAdminResource(actor,"companies",{logo_url:null},companyId,run);
      await deleteNeonManagedMedia(actor,{module:"company_logo",resourceId:companyId,path:logo.path},run);
      expect(await headObject(logo.bucket,logo.path)).toBeNull();
      const advertisement=await saveNeonAdminResource(actor,"advertisements",{title:`Isolated banner ${companyOwner}`,placement:"homepage",
        image_url:"https://example.test/banner.png",start_date:start,end_date:end,status:"scheduled"},undefined,run);
      const adId=String(advertisement.id);
      const banner=await uploadNeonManagedMedia(actor,{module:"advertisement",resourceId:adId,fileName:"banner.png",contentType:"image/png",bytes:png},run);
      objects.push(banner);
      await saveNeonAdminResource(actor,"advertisements",{image_url:banner.path},adId,run);
      const adDownload=await downloadNeonManagedMedia(actor,{module:"advertisement",resourceId:adId,path:banner.path},run);
      expect(Buffer.from(await (await fetch(adDownload.signedUrl)).arrayBuffer()).equals(Buffer.from(png))).toBe(true);
      await expect(deleteNeonManagedMedia(actor,{module:"advertisement",resourceId:adId,path:banner.path},run)).rejects.toMatchObject({code:"MEDIA_STILL_REFERENCED"});
      await saveNeonAdminResource(actor,"advertisements",{image_url:"https://example.test/banner.png"},adId,run);
      await deleteNeonManagedMedia(actor,{module:"advertisement",resourceId:adId,path:banner.path},run);
      expect(await headObject(banner.bucket,banner.path)).toBeNull();
      const image=await uploadNeonManagedMedia(actor,{module:"event_cover",resourceId:eventId,fileName:"isolated.png",contentType:"image/png",bytes:png},run);
      objects.push(image);
      expect(image.path).toContain(`/event_cover/${eventId}/`);
      const imageResponse=await fetch(image.publicUrl);expect(imageResponse.status).toBe(200);
      expect(Buffer.from(await imageResponse.arrayBuffer()).equals(Buffer.from(png))).toBe(true);
      const pdf=new TextEncoder().encode("%PDF-1.4\n% Isolated staging attachment fixture\n%%EOF\n");
      const document=await uploadNeonManagedMedia(actor,{module:"event_attachment",resourceId:eventId,fileName:"isolated.pdf",contentType:"application/pdf",bytes:pdf},run);
      objects.push(document);expect(document.publicUrl).toBe("");
      await expect(downloadNeonManagedMedia(actor,{module:"event_attachment",resourceId:eventId,path:document.path},run)).rejects.toMatchObject({code:"MEDIA_NOT_REFERENCED"});
      await saveNeonAdminResource(actor,"events",{cover_image_url:image.path,attachment_path:document.path,attachment_name:"isolated.pdf",attachment_mime_type:"application/pdf"},eventId,run);
      const download=await downloadNeonManagedMedia(actor,{module:"event_attachment",resourceId:eventId,path:document.path},run);
      const response=await fetch(download.signedUrl);expect(response.status).toBe(200);
      expect(Buffer.from(await response.arrayBuffer()).equals(Buffer.from(pdf))).toBe(true);
      await expect(deleteNeonManagedMedia(actor,{module:"event_attachment",resourceId:eventId,path:document.path},run)).rejects.toMatchObject({code:"MEDIA_STILL_REFERENCED"});
      await saveNeonAdminResource(actor,"events",{cover_image_url:null,attachment_path:null,attachment_name:null,attachment_mime_type:null},eventId,run);
      await deleteNeonManagedMedia(actor,{module:"event_attachment",resourceId:eventId,path:document.path},run);
      expect(await headObject(document.bucket,document.path)).toBeNull();
      await deleteNeonManagedMedia(actor,{module:"event_cover",resourceId:eventId,path:image.path},run);
      expect(await headObject(image.bucket,image.path)).toBeNull();
    }finally{
      for(const object of objects)await deleteObject(object.bucket,object.path).catch(()=>undefined);
      await client.query("ROLLBACK").catch(()=>undefined);client.release();await getPool().end();
    }
  },60000);
});
