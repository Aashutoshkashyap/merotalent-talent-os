import {describe,expect,it,vi} from "vitest";
import {loadNeonAdminReport} from "@/lib/server/neon-admin-reports";
import {parseAdminReportQuery} from "@/lib/admin/admin-report-service";
import type {NeonActor,NeonQueryExecutor} from "@/lib/server/neon-authorization";
const actor:NeonActor={userId:"10000000-0000-4000-8000-000000000001",neonAuthUserId:"20000000-0000-4000-8000-000000000002",
  roles:["admin"],permissions:[],platformAdmin:true};
const options=parseAdminReportQuery(new URLSearchParams("from=2026-10-01&to=2026-10-14&limit=10&page=2"));
describe("Neon confidential admin reports",()=>{
  it("denies ordinary and revoked administrator identities",async()=>{
    const query=vi.fn(async()=>[{allowed:false,rows:[]}]);const db={query} as unknown as NeonQueryExecutor;
    await expect(loadNeonAdminReport({...actor,platformAdmin:false},"applications",options,db)).rejects.toMatchObject({status:403});
    expect(query).not.toHaveBeenCalled();
    await expect(loadNeonAdminReport(actor,"applications",options,db)).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
  });
  it("uses human application fields, bounded dates and trusted identity rather than requester IDs",async()=>{
    const row={applicant_name:"Applicant",target_name:"College A",status:"submitted"};
    const query=vi.fn(async()=>[{allowed:true,rows:[row]}]);
    expect(await loadNeonAdminReport(actor,"applications",options,{query} as unknown as NeonQueryExecutor)).toEqual([row]);
    const [sql,params]=query.mock.calls[0] as unknown as [string,unknown[]];
    expect(sql).toContain("UNION ALL");expect(sql).toContain("l.neon_auth_user_id=$2::uuid");
    expect(sql).toContain("deleted_at IS NULL");
    expect(params).toEqual([actor.userId,actor.neonAuthUserId,"2026-10-01","2026-10-15",10,10]);
  });
});
