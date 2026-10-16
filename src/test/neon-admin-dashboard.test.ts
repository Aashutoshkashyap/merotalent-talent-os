import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {NeonActor} from "@/lib/server/neon-authorization";
const mocks=vi.hoisted(()=>({actor:null as NeonActor|null,query:vi.fn()}));
vi.mock("@/lib/server/neon-session",async original=>({...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser:async()=>{if(!mocks.actor)throw new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401,"AUTH_REQUIRED","No session");return mocks.actor;}}));
vi.mock("@/lib/server/db",()=>({queryRows:mocks.query}));
import {GET} from "../../app/api/v1/neon-staging/admin/dashboard/route";
const previous=process.env.MEROTALENT_BACKEND_MODE;
beforeEach(()=>{process.env.MEROTALENT_BACKEND_MODE="neon-staging";mocks.actor={userId:"10000000-0000-4000-8000-000000000001",
  neonAuthUserId:"20000000-0000-4000-8000-000000000002",roles:["admin"],permissions:[],platformAdmin:true};});
afterEach(()=>{if(previous===undefined)delete process.env.MEROTALENT_BACKEND_MODE;else process.env.MEROTALENT_BACKEND_MODE=previous;vi.clearAllMocks();});
describe("Neon Super Admin dashboard",()=>{
  it("denies anonymous and ordinary users before private metrics",async()=>{
    mocks.actor=null;expect((await GET(new Request("https://app.test/api/v1/neon-staging/admin/dashboard"))).status).toBe(401);
    mocks.actor={userId:"10000000-0000-4000-8000-000000000001",neonAuthUserId:"20000000-0000-4000-8000-000000000002",roles:["talent"],permissions:[],platformAdmin:false};
    expect((await GET(new Request("https://app.test/api/v1/neon-staging/admin/dashboard"))).status).toBe(403);expect(mocks.query).not.toHaveBeenCalled();
  });
  it("checks persisted admin identity and returns bounded private data",async()=>{
    mocks.query.mockResolvedValue([{allowed:true,data:{stats:{users:104},usersList:[],jobsList:[],institutionsList:[],competitionsList:[],coursesList:[],mentorsList:[]}}]);
    const response=await GET(new Request("https://app.test/api/v1/neon-staging/admin/dashboard"));expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");expect((await response.json()).data.stats.users).toBe(104);
    expect(mocks.query.mock.calls[0][0]).toContain("l.neon_auth_user_id=$2::uuid");expect(mocks.query.mock.calls[0][0]).toContain("LIMIT 10");
    mocks.query.mockResolvedValue([{allowed:false,data:null}]);expect((await GET(new Request("https://app.test/api/v1/neon-staging/admin/dashboard"))).status).toBe(403);
  });
});
