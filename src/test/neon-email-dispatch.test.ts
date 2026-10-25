import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({after:vi.fn(),dispatch:vi.fn()}));
vi.mock("next/server",()=>({after:mocks.after}));
vi.mock("@/lib/server/neon-email-queue",()=>({dispatchNeonQueuedEmails:mocks.dispatch}));
import {scheduleNeonEmailDelivery} from "@/lib/server/neon-email-dispatch";
const env={MEROTALENT_BACKEND_MODE:"neon-staging",CRON_SECRET:"unit-cron",NEON_STAGING_EMAIL_DELIVERY_ENABLED:"true",NEON_STAGING_EMAIL_TEST_RECIPIENTS:"qa@example.test"};
describe("Post-response transactional email dispatch",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("does not send copied notifications or bypass disabled delivery",()=>{
    expect(scheduleNeonEmailDelivery({...env,NEON_STAGING_EMAIL_DELIVERY_ENABLED:"false"})).toBe(false);
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("schedules only after response and retains queue authorization and limits",async()=>{
    mocks.dispatch.mockResolvedValue({configured:true,sent:1});
    expect(scheduleNeonEmailDelivery(env)).toBe(true);
    expect(mocks.dispatch).not.toHaveBeenCalled();
    const log=vi.spyOn(console,"info").mockImplementation(()=>{});
    await mocks.after.mock.calls[0][0]();
    expect(mocks.dispatch).toHaveBeenCalledWith("Bearer unit-cron",10,{environment:env});
    log.mockRestore();
  });
});
