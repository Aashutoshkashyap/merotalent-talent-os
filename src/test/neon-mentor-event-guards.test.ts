import { afterEach, describe, expect, it, vi } from "vitest";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { EsewaV2PaymentProvider } from "@/lib/server/payment-provider";

vi.mock("@/lib/server/neon-application-events", () => ({ appendNotificationEvent: vi.fn() }));

const actor: NeonActor = {
  userId: "11111111-1111-4111-8111-111111111111",
  neonAuthUserId: "22222222-2222-4222-8222-222222222222",
  roles: ["talent"], permissions: [], platformAdmin: false,
};
const mentorId = "33333333-3333-4333-8333-333333333333";
const serviceId = "44444444-4444-4444-8444-444444444444";
const eventId = "55555555-5555-4555-8555-555555555555";
const tierId = "66666666-6666-4666-8666-666666666666";

function mentorClient(conflict = false) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const query = vi.fn(async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    if (sql.includes("FROM public.mentors m")) return { rows: [{ id: mentorId, user_id: "77777777-7777-4777-8777-777777777777", is_available: true, approval_status: "approved" }] };
    if (sql.includes("AS ready")) return { rows: [{ ready: true }] };
    if (sql.includes("FROM public.mentor_services")) return { rows: [{ id: serviceId, duration_minutes: 60, price: 500, currency: "NPR", session_type: "one_to_one", capacity: 1, title: "Career guidance" }] };
    if (sql.includes("FROM public.mentor_bookings")) return { rows: conflict ? [{ id: crypto.randomUUID() }] : [] };
    if (sql.includes("INSERT INTO public.mentor_bookings")) return { rows: [{ id: crypto.randomUUID(), amount: 500, status: "pending", payment_status: "pending" }] };
    if (sql.includes("INSERT INTO public.notifications")) return { rows: [{ id: crypto.randomUUID() }] };
    return { rows: [] };
  });
  return { client: { query } as any, calls };
}

function eventClient(price: number, sold = 0) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const query = vi.fn(async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    if (sql.includes("FROM public.events")) return { rows: [{ id: eventId, title: "Workshop", ticket_price: 0, currency: "NPR", capacity: 10,
      registration_deadline: null, start_date: new Date(Date.now() + 86400000), is_active: true, approval_status: "approved", status: "published" }] };
    if (sql.includes("FROM public.event_ticket_types")) return { rows: [{ id: tierId, price, currency: "NPR", min_per_order: 1, max_per_order: 10, total_quantity: 10, sales_start_at: null, sales_end_at: null }] };
    if (sql.includes("SUM(ticket_quantity)")) return { rows: [{ count: sold }] };
    if (sql.includes("FROM public.event_registrations")) return { rows: [] };
    if (sql.includes("INSERT INTO public.event_registrations")) return { rows: [{ id: crypto.randomUUID(), payment_status: price ? "pending" : "not_required", status: price ? "pending" : "confirmed", total_amount: price * Number(values[5]) }] };
    if (sql.includes("INSERT INTO public.notifications")) return { rows: [{ id: crypto.randomUUID() }] };
    return { rows: [] };
  });
  return { client: { query } as any, calls };
}

describe("Neon mentor and event transactional guards", () => {
  afterEach(()=>vi.unstubAllEnvs());
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(new Date(start).getTime() + 3600000).toISOString();

  it('disabled production payments cannot reserve paid mentor or event capacity, while free events remain usable',async()=>{
    vi.stubEnv('MEROTALENT_BACKEND_MODE','neon-production');
    vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE','neon-production');
    vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED','false');
    const mentor=mentorClient(),event=eventClient(250),free=eventClient(0);
    await expect(new NeonMentorsRepository().bookMentorSession(actor,{mentorId,mentorServiceId:serviceId,scheduledStart:start,scheduledEnd:end,topic:'Advice'},mentor.client)).rejects.toMatchObject({code:'PAYMENTS_DISABLED'});
    await expect(new NeonEventsRepository().registerForEvent(actor,{eventId,ticketTypeId:tierId,ticketQuantity:1},event.client)).rejects.toMatchObject({code:'PAYMENTS_DISABLED'});
    expect([...mentor.calls,...event.calls].some(call=>call.sql.includes('INSERT INTO'))).toBe(false);
    await expect(new NeonEventsRepository().registerForEvent(actor,{eventId,ticketTypeId:tierId,ticketQuantity:1},free.client)).resolves.toMatchObject({status:'confirmed'});
  });

  it("prices a mentor booking from its published service, never a client amount", async () => {
    const { client, calls } = mentorClient();
    const result = await new NeonMentorsRepository().bookMentorSession(actor,
      { mentorId, mentorServiceId: serviceId, scheduledStart: start, scheduledEnd: end,
        topic: "Advice", amount: 1 } as any, client);
    expect(result.payment_status).toBe("pending");
    const insert = calls.find((call) => call.sql.includes("INSERT INTO public.mentor_bookings"))!;
    expect(insert.values[7]).toBe(500);
    expect(insert.values[6]).toBe("pending");
  });

  it("refuses overlapping mentor bookings before any insert", async () => {
    const { client, calls } = mentorClient(true);
    await expect(new NeonMentorsRepository().bookMentorSession(actor,
      { mentorId, mentorServiceId: serviceId, scheduledStart: start, scheduledEnd: end, topic: "Advice" }, client))
      .rejects.toMatchObject({ code: "SLOT_TAKEN" });
    expect(calls.some((call) => call.sql.includes("INSERT INTO public.mentor_bookings"))).toBe(false);
  });

  it("derives paid ticket amount from the selected tier and issues no unpaid pass", async () => {
    const { client, calls } = eventClient(250);
    const result = await new NeonEventsRepository().registerForEvent(actor,
      { eventId, ticketTypeId: tierId, ticketQuantity: 2 }, client);
    expect(result.status).toBe("pending");
    const insert = calls.find((call) => call.sql.includes("INSERT INTO public.event_registrations"))!;
    expect(insert.values[6]).toBe(500);
    expect(calls.some((call) => call.sql.includes("INSERT INTO public.event_tickets"))).toBe(false);
  });

  it("issues free passes and refuses sold-out tier capacity", async () => {
    const free = eventClient(0);
    const result = await new NeonEventsRepository().registerForEvent(actor,
      { eventId, ticketTypeId: tierId, ticketQuantity: 2 }, free.client);
    expect(result.status).toBe("confirmed");
    expect(free.calls.filter((call) => call.sql.includes("INSERT INTO public.event_tickets"))).toHaveLength(2);
    const soldOut = eventClient(0, 9);
    await expect(new NeonEventsRepository().registerForEvent(actor,
      { eventId, ticketTypeId: tierId, ticketQuantity: 2 }, soldOut.client))
      .rejects.toMatchObject({ code: "TICKET_SOLD_OUT" });
  });

  it("uses only signed eSewa test fixtures and rejects a forged return", async () => {
    const provider = new EsewaV2PaymentProvider("fixture-secret-only", { merchantCode: "EPAYTEST", environment: "uat" });
    const checkout = await provider.createCheckout({ paymentId: crypto.randomUUID(), amount: 500,
      currency: "NPR", description: "Staging fixture", returnUrl: "http://localhost:3210/return" });
    expect(checkout.status).toBe("pending");
    expect(checkout.checkoutUrl).toContain("rc-epay.esewa.com.np");
    expect(provider.verifyRedirectPayload({ ...checkout.checkoutFields, signature: "forged" })).toBe(false);
    const status = await provider.lookupStatus({ reference: checkout.checkoutFields!.transaction_uuid, amount: 500,
      fetcher: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "COMPLETE", product_code: "EPAYTEST", total_amount: "500.00",
        transaction_uuid: checkout.checkoutFields!.transaction_uuid, ref_id: "fixture-reference" }) }) as unknown as typeof fetch });
    expect(status.status).toBe("successful");
    await expect(provider.lookupStatus({ reference: checkout.checkoutFields!.transaction_uuid, amount: 500,
      fetcher: vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "COMPLETE", product_code: "EPAYTEST", total_amount: "1.00",
        transaction_uuid: checkout.checkoutFields!.transaction_uuid }) }) as unknown as typeof fetch }))
      .rejects.toThrow(/amount/);
  });

  it("keeps malformed, disputed, or unavailable eSewa replies unfulfilled", async () => {
    const provider = new EsewaV2PaymentProvider("fixture-secret-only", { merchantCode: "EPAYTEST", environment: "uat" });
    const reference = crypto.randomUUID();
    const fetcher = (body: Record<string, unknown>) => vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ product_code: "EPAYTEST", transaction_uuid: reference,
        total_amount: 500, ...body }),
    }) as unknown as typeof fetch;
    expect((await provider.lookupStatus({ reference, amount: 500, fetcher: fetcher({ status: "PENDING" }), strict: true })).status).toBe("pending");
    expect((await provider.lookupStatus({ reference, amount: 500, fetcher: fetcher({ status: "AMBIGUOUS" }), strict: true })).status).toBe("pending");
    expect((await provider.lookupStatus({ reference, amount: 500, fetcher: fetcher({ status: "FULL_REFUND" }), strict: true })).status).toBe("refunded");
    await expect(provider.lookupStatus({ reference, amount: 500, fetcher: fetcher({ product_code: "ATTACKER", status: "COMPLETE" }), strict: true }))
      .rejects.toThrow(/merchant code/);
    await expect(provider.lookupStatus({ reference, amount: 500, strict: true,
      fetcher: vi.fn().mockRejectedValue(new Error("sandbox timeout")) as unknown as typeof fetch }))
      .rejects.toThrow(/timeout/);
  });
  it.each([undefined,null,"invalid","",true,"Infinity","500.01","500.001"])("rejects invalid or inexact provider amount %j",async amount=>{
    const provider=new EsewaV2PaymentProvider("fixture-secret-only",{merchantCode:"EPAYTEST",environment:"uat"});
    await expect(provider.lookupStatus({reference:"fixture",amount:500,strict:true,fetcher:vi.fn().mockResolvedValue({ok:true,json:async()=>({product_code:"EPAYTEST",transaction_uuid:"fixture",status:"COMPLETE",total_amount:amount,ref_id:"fixture-ref"})}) as unknown as typeof fetch})).rejects.toThrow(/amount/);
  });
  it("requires a provider transaction ID for completion and preserves cancelled/expired states",async()=>{
    const provider=new EsewaV2PaymentProvider("fixture-secret-only",{merchantCode:"EPAYTEST",environment:"uat"});
    const lookup=(status:string)=>provider.lookupStatus({reference:"fixture",amount:500,strict:true,fetcher:vi.fn().mockResolvedValue({ok:true,json:async()=>({product_code:"EPAYTEST",transaction_uuid:"fixture",status,total_amount:500})}) as unknown as typeof fetch});
    await expect(lookup("COMPLETE")).rejects.toThrow(/reference/);
    await expect(lookup("CANCELED")).resolves.toMatchObject({status:"cancelled"});
    await expect(lookup("NOT_FOUND")).resolves.toMatchObject({status:"expired"});
  });
});
