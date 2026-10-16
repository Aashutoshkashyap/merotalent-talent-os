import { describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { deleteNeonAdminResource, listNeonAdminResource, neonAdminDefinition, saveNeonAdminResource } from "@/lib/server/neon-admin-resources";
import { sanitizeAdminWrite } from "@/lib/admin/admin-resource-service";

const actor:NeonActor={userId:"11111111-1111-4111-8111-111111111111",neonAuthUserId:"22222222-2222-4222-8222-222222222222",roles:["super_admin"],permissions:[],platformAdmin:true};
describe("Neon declarative Super Admin resources",()=>{
  it("rejects students and module admins before reading private resource data",async()=>{
    const query=vi.fn();
    await expect(listNeonAdminResource({...actor,roles:["college_admin"],platformAdmin:false},"college-applications",new URLSearchParams(),query))
      .rejects.toMatchObject({code:"ADMIN_REQUIRED"});
    expect(query).not.toHaveBeenCalled();
  });
  it("rejects forged admin flags when the verified identity and database role do not agree",async()=>{
    const query=vi.fn().mockResolvedValue([{allowed:false}]);
    await expect(listNeonAdminResource(actor,"payments",new URLSearchParams(),query)).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual([actor.userId,actor.neonAuthUserId]);
  });
  it("keeps capability grants and payment/service confirmations behind their dedicated workflows",async()=>{
    const run=vi.fn();
    for(const resource of ["user-roles","user-permissions","access-requests","payments","subscriptions","mentor-bookings","event-registrations"] as const){
      await expect(saveNeonAdminResource(actor,resource,{status:"success"},undefined,run)).rejects.toMatchObject({code:"DEDICATED_WORKFLOW_REQUIRED",status:405});
      await expect(deleteNeonAdminResource(actor,resource,actor.userId,run)).rejects.toMatchObject({code:"DEDICATED_WORKFLOW_REQUIRED"});
    }
    expect(run).not.toHaveBeenCalled();
  });
  it("rejects arbitrary filters and keeps search text in parameters",async()=>{
    const query=vi.fn().mockResolvedValueOnce([{allowed:true}]).mockResolvedValueOnce([{count:"0"}]).mockResolvedValueOnce([]);
    await expect(listNeonAdminResource(actor,"jobs",new URLSearchParams({search:"%' OR true --"}),query)).resolves.toMatchObject({data:[],meta:{total:0}});
    expect(query.mock.calls[2][0]).not.toContain("OR true --");
    expect(query.mock.calls[2][1]).toContain("%\\%' OR true --%");
    await expect(listNeonAdminResource(actor,"jobs",new URLSearchParams({sort_by:"id; DROP TABLE jobs"}),query)).rejects.toMatchObject({name:"AdminResourceValidationError"});
  });
  it("accepts real institute and event form fields but rejects client approval impersonation",()=>{
    expect(sanitizeAdminWrite(neonAdminDefinition("colleges"),"create",{name:"Unassigned college",institution_category:"school",affiliation:"NEB",applications_enabled:true}))
      .toMatchObject({name:"Unassigned college",institution_category:"school"});
    expect(sanitizeAdminWrite(neonAdminDefinition("events"),"update",{registration_open_at:null,registration_close_at:null,is_multi_program:true,terms_and_conditions:"Valid public terms",lifecycle_status:"published"}))
      .toMatchObject({is_multi_program:true});
    expect(()=>sanitizeAdminWrite(neonAdminDefinition("events"),"update",{approved_by:actor.userId,approval_status:"approved"})).toThrow();
    expect(()=>sanitizeAdminWrite(neonAdminDefinition("colleges"),"update",{is_verified:true})).toThrow();
  });
  it("validates company ownership and public content while preventing client owner reassignment",()=>{
    expect(sanitizeAdminWrite(neonAdminDefinition("companies"),"create",{user_id:actor.userId,name:"Employer",size:"11-50",is_verified:true}))
      .toMatchObject({user_id:actor.userId,name:"Employer",is_verified:true});
    expect(()=>sanitizeAdminWrite(neonAdminDefinition("companies"),"update",{user_id:actor.userId})).toThrow();
    expect(()=>sanitizeAdminWrite(neonAdminDefinition("companies"),"create",{name:"Missing owner"})).toThrow();
    expect(()=>sanitizeAdminWrite(neonAdminDefinition("companies"),"update",{website:"javascript:alert(1)"})).toThrow();
    expect(()=>sanitizeAdminWrite(neonAdminDefinition("companies"),"update",{size:"million"})).toThrow();
  });
});
