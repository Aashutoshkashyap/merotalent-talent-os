import {beforeEach,describe,expect,it,vi} from "vitest";
import type {PoolClient} from "pg";
import type {NeonActor} from "@/lib/server/neon-authorization";
const mocks=vi.hoisted(()=>({access:vi.fn()}));
vi.mock("@/lib/server/neon-authorization",async original=>({...await original<typeof import("@/lib/server/neon-authorization")>(),requireEntityAccess:mocks.access}));
import {deleteNeonManagedMedia,downloadNeonManagedMedia,uploadNeonManagedMedia,validateManagedMediaBytes} from "@/lib/server/neon-managed-media";
const actor:NeonActor={userId:"11111111-1111-4111-8111-111111111111",neonAuthUserId:"22222222-2222-4222-8222-222222222222",roles:["talent"],permissions:[],platformAdmin:false};
const id="33333333-3333-4333-8333-333333333333";
const path=`${actor.userId}/event_attachment/${id}/44444444-4444-4444-8444-444444444444.pdf`;
const png=Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5hcAAAAASUVORK5CYII=","base64"));
const io={head:vi.fn(),put:vi.fn(),remove:vi.fn(),sign:vi.fn()};
const state={identity:true,admin:false,referenced:true,intent:true,quota:0,resource:true};
const query=vi.fn(async(sql:string)=>{
  if(sql.includes("AS admin"))return{rows:state.identity?[{admin:state.admin}]:[],rowCount:state.identity?1:0};
  if(sql.includes("COALESCE(sum(declared_size)"))return{rows:[{count:state.quota,bytes:"0"}],rowCount:1};
  if(sql.includes("FROM public.media_upload_intents")&&!sql.includes("count(*)"))return{rows:state.intent?[{id}]:[],rowCount:state.intent?1:0};
  if(sql.startsWith("SELECT id FROM public.events")&&sql.includes("attachment_path"))return{rows:state.referenced?[{id}]:[],rowCount:state.referenced?1:0};
  if(sql.startsWith("SELECT id FROM public.events"))return{rows:state.resource?[{id}]:[],rowCount:state.resource?1:0};
  return{rows:[],rowCount:1};
});
const run=<T>(operation:(client:PoolClient)=>Promise<T>)=>operation({query} as unknown as PoolClient);
beforeEach(()=>{vi.clearAllMocks();Object.assign(state,{identity:true,admin:false,referenced:true,intent:true,quota:0,resource:true});mocks.access.mockResolvedValue(undefined);
  io.put.mockResolvedValue(undefined);io.remove.mockResolvedValue(undefined);io.head.mockResolvedValue({contentType:"application/pdf",contentLength:8});io.sign.mockResolvedValue({signedUrl:"https://signed.test/private",download:true,expiresIn:300,expiresAt:"later"});});
describe("Neon managed listing media",()=>{
  it("validates actual bytes instead of trusting an image/document MIME declaration",async()=>{
    await expect(validateManagedMediaBytes(new TextEncoder().encode("<script>bad()</script>"),"image/png")).rejects.toMatchObject({code:"INVALID_IMAGE"});
    await expect(validateManagedMediaBytes(png,"image/png")).resolves.toBeUndefined();
    await expect(validateManagedMediaBytes(png,"application/pdf")).rejects.toMatchObject({code:"INVALID_DOCUMENT"});
  });
  it("denies stale, forged and cross-entity upload actors before touching storage",async()=>{
    state.identity=false;
    await expect(uploadNeonManagedMedia(actor,{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:png},run,io)).rejects.toMatchObject({code:"MEDIA_ACCESS_DENIED"});
    state.identity=true;
    await expect(uploadNeonManagedMedia({...actor,platformAdmin:true},{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:png},run,io)).rejects.toMatchObject({code:"MEDIA_ACCESS_DENIED"});
    mocks.access.mockRejectedValueOnce(new Error("Scope revoked"));
    await expect(uploadNeonManagedMedia(actor,{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:png},run,io)).rejects.toThrow("Scope revoked");
    expect(io.put).not.toHaveBeenCalled();
  });
  it("uses exact company scopes for company logos and keeps advertisement media platform-admin only",async()=>{
    io.head.mockResolvedValueOnce(null).mockResolvedValueOnce({contentType:"image/png",contentLength:png.byteLength});
    const result=await uploadNeonManagedMedia(actor,{module:"company_logo",resourceId:id,fileName:"logo.png",contentType:"image/png",bytes:png},run,io);
    expect(result.bucket).toBe("profile-media");
    expect(result.path).toContain(`/company_logo/${id}/`);
    expect(mocks.access).toHaveBeenCalledWith(expect.objectContaining({userId:actor.userId}),"jobs","company",id,"media_management",expect.anything());
    io.put.mockClear();
    await expect(uploadNeonManagedMedia(actor,{module:"advertisement",resourceId:id,fileName:"banner.png",contentType:"image/png",bytes:png},run,io)).rejects.toMatchObject({code:"MEDIA_ACCESS_DENIED"});
    expect(io.put).not.toHaveBeenCalled();
  });
  it("binds uploads to the exact entity, enforces quotas, verifies stored metadata and audits success",async()=>{
    io.head.mockResolvedValueOnce(null).mockResolvedValueOnce({contentType:"image/png",contentLength:png.byteLength});
    const result=await uploadNeonManagedMedia(actor,{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:png},run,io);
    expect(result.path).toContain(`${actor.userId}/event_cover/${id}/`);
    expect(mocks.access).toHaveBeenCalledWith(expect.objectContaining({userId:actor.userId}),"events","event",id,"media_management",expect.anything());
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO public.media_upload_intents"),expect.arrayContaining([actor.userId,"event_cover",id,result.path,png.byteLength]));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("upload_listing_media"),expect.any(Array));
    state.quota=30;io.put.mockClear();
    await expect(uploadNeonManagedMedia(actor,{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:png},run,io)).rejects.toMatchObject({code:"MEDIA_RATE_LIMITED"});
    expect(io.put).not.toHaveBeenCalled();
  });
  it("cleans a newly stored object when metadata verification or transaction commit fails",async()=>{
    io.head.mockResolvedValueOnce(null).mockResolvedValueOnce({contentType:"text/html",contentLength:png.byteLength});
    await expect(uploadNeonManagedMedia(actor,{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:png},run,io)).rejects.toMatchObject({code:"MEDIA_VERIFICATION_FAILED"});
    expect(io.remove).toHaveBeenCalledWith("event-media",expect.stringContaining(`${actor.userId}/event_cover/${id}/`));
  });
  it("requires exact private listing metadata and rejects missing or disallowed stored files",async()=>{
    const result=await downloadNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path},run,io);
    expect(result.signedUrl).toBe("https://signed.test/private");
    expect(io.sign).toHaveBeenCalledWith("event-attachments",path,300,true);
    state.referenced=false;io.sign.mockClear();
    await expect(downloadNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path},run,io)).rejects.toMatchObject({code:"MEDIA_NOT_REFERENCED"});
    expect(io.sign).not.toHaveBeenCalled();
    state.referenced=true;io.head.mockResolvedValueOnce(null);
    await expect(downloadNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path},run,io)).rejects.toMatchObject({code:"MEDIA_NOT_FOUND"});
    io.head.mockResolvedValueOnce({contentType:"text/html",contentLength:8});
    await expect(downloadNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path},run,io)).rejects.toMatchObject({code:"MEDIA_POLICY_VIOLATION"});
  });
  it("preserves referenced or foreign files and deletes only the current uploader's unreferenced object",async()=>{
    await expect(deleteNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path},run,io)).rejects.toMatchObject({code:"MEDIA_STILL_REFERENCED"});
    expect(io.remove).not.toHaveBeenCalled();
    await expect(deleteNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path:path.replace(actor.userId,id)},run,io)).rejects.toMatchObject({code:"MEDIA_OWNER_MISMATCH"});
    state.referenced=false;
    await expect(deleteNeonManagedMedia(actor,{module:"event_attachment",resourceId:id,path},run,io)).resolves.toEqual({deleted:true});
    expect(io.remove).toHaveBeenCalledWith("event-attachments",path);
  });
});
