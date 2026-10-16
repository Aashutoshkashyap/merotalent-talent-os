// @vitest-environment node
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {NeonActor} from "@/lib/server/neon-authorization";
const mocks=vi.hoisted(()=>({actor:null as NeonActor|null,upload:vi.fn(),download:vi.fn(),remove:vi.fn()}));
vi.mock("@/lib/server/neon-session",async original=>({...await original<typeof import("@/lib/server/neon-session")>(),getAuthenticatedApplicationUser:vi.fn(async()=>{
  if(!mocks.actor)throw new(await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401,"AUTH_REQUIRED","Sign in.");return mocks.actor;
})}));
vi.mock("@/lib/server/neon-managed-media",async original=>({...await original<typeof import("@/lib/server/neon-managed-media")>(),
  uploadNeonManagedMedia:mocks.upload,downloadNeonManagedMedia:mocks.download,deleteNeonManagedMedia:mocks.remove}));
import {handleManagedMediaDownload,handleManagedMediaUpload} from "@/lib/server/neon-managed-media-route";
const origin="https://staging.test",id="33333333-3333-4333-8333-333333333333";
const actor:NeonActor={userId:"11111111-1111-4111-8111-111111111111",neonAuthUserId:"22222222-2222-4222-8222-222222222222",roles:["talent"],permissions:[],platformAdmin:false};
const old=process.env.MEROTALENT_BACKEND_MODE;
beforeEach(()=>{process.env.MEROTALENT_BACKEND_MODE="neon-staging";mocks.actor=actor;mocks.upload.mockResolvedValue({bucket:"event-media",path:"canonical/path",publicUrl:"signed-preview"});});
afterEach(()=>{if(old===undefined)delete process.env.MEROTALENT_BACKEND_MODE;else process.env.MEROTALENT_BACKEND_MODE=old;vi.clearAllMocks();});
async function upload(originHeader=origin,duplicate=false){
  const form=new FormData();form.set("module","event_cover");form.set("resourceId",id);form.set("file",new File(["image bytes"],"cover.png",{type:"image/png"}));
  if(duplicate)form.append("resourceId",id);
  const template=new Request(`${origin}/api/v1/neon-staging/media`,{method:"POST",body:form});
  const bytes=await template.arrayBuffer();
  return handleManagedMediaUpload(new Request(template.url,{method:"POST",headers:{origin:originHeader,"content-type":template.headers.get("content-type")!,"content-length":String(bytes.byteLength)},body:bytes}));
}
describe("Neon managed media HTTP boundary",()=>{
  it("denies legacy, anonymous and cross-origin uploads without invoking storage",async()=>{
    process.env.MEROTALENT_BACKEND_MODE="legacy";expect((await upload()).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE="neon-staging";mocks.actor=null;expect((await upload()).status).toBe(401);
    mocks.actor=actor;expect((await upload("https://attacker.test")).status).toBe(403);expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects duplicate multipart scopes and caps actual bytes even with a false Content-Length",async()=>{
    expect((await upload(origin,true)).status).toBe(422);
    const response=await handleManagedMediaUpload(new Request(`${origin}/api/v1/neon-staging/media`,{method:"POST",headers:{origin,"content-type":"multipart/form-data; boundary=test","content-length":"1"},body:new Uint8Array(10*1024*1024+65537)}));
    expect(response.status).toBe(413);expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("passes only the authenticated identity, parsed listing scope and real file bytes to the adapter",async()=>{
    const response=await upload();expect(response.status).toBe(201);
    expect(mocks.upload).toHaveBeenCalledWith(actor,{module:"event_cover",resourceId:id,fileName:"cover.png",contentType:"image/png",bytes:expect.any(Uint8Array)});
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("requires same-origin authenticated private download requests",async()=>{
    mocks.actor=null;
    const request=(requestOrigin:string)=>new Request(`${origin}/api/v1/media/download-url`,{method:"POST",headers:{origin:requestOrigin,"content-type":"application/json"},body:JSON.stringify({module:"event_attachment",resourceId:id,path:"attached.pdf"})});
    expect((await handleManagedMediaDownload(request(origin))).status).toBe(401);
    mocks.actor=actor;expect((await handleManagedMediaDownload(request("https://attacker.test"))).status).toBe(403);expect(mocks.download).not.toHaveBeenCalled();
  });
});
