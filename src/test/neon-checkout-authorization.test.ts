import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import type { NeonActor } from "@/lib/server/neon-authorization";
import type { EsewaV2PaymentProvider } from "@/lib/server/payment-provider";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";

const actor: NeonActor = { userId:"10000000-0000-4000-8000-000000000001",
  neonAuthUserId:"20000000-0000-4000-8000-000000000002", roles:["talent"],permissions:[],platformAdmin:false };
const targetId = "30000000-0000-4000-8000-000000000003";
const provider = () => ({ createCheckout:vi.fn(async () => ({ status:"pending",checkoutUrl:"https://sandbox.example.invalid",
  checkoutFields:{ product_code:"test" } })) }) as unknown as EsewaV2PaymentProvider;

describe("Neon checkout authorization and retry", () => {
  it("records delayed successful provider evidence for an already expired checkout without activating services",async()=>{
    const row={id:targetId,user_id:actor.userId,entity_type:"mentor_booking",entity_id:targetId,
      provider_reference:targetId,amount:10,currency:"NPR",status:"expired",expires_at:new Date(Date.now()-1000)};
    const query=vi.fn(async(sql:string)=>({rows:sql.startsWith("SELECT")?[row]:[],rowCount:1}));
    const adapter={lookupStatus:vi.fn(async()=>({status:"successful",transactionId:"verified-fixture"}))} as unknown as EsewaV2PaymentProvider;
    expect(await new NeonCheckoutService(adapter).verifyReturn({reference:targetId},
      {query} as unknown as Pick<PoolClient,"query">)).toMatchObject({status:"expired",manualReview:true});
    expect(query.mock.calls.some(([sql])=>sql.includes("reconciliation_status='disputed'"))).toBe(true);
    expect(query.mock.calls.some(([sql])=>sql.includes("SET status='confirmed'"))).toBe(false);
  });
  it("denies a revoked identity before inserting a payment or invoking checkout", async () => {
    const adapter=provider();
    const query=vi.fn(async () => ({rows:[]}));
    await expect(new NeonCheckoutService(adapter).initiate(actor,"mentor_booking",targetId,"http://localhost:3210",
      {query} as unknown as Pick<PoolClient,"query">)).rejects.toMatchObject({code:"IDENTITY_NOT_LINKED"});
    expect(query).toHaveBeenCalledOnce();
    expect(adapter.createCheckout).not.toHaveBeenCalled();
  });
  it("expires overdue pending sessions before inserting the replacement", async () => {
    const query=vi.fn(async (sql:string) => {
      if (sql.includes("SELECT true AS allowed")) return {rows:[{allowed:true}]};
      if (sql.includes("SELECT b.student_id")) return {rows:[{student_id:actor.userId,amount:10,currency:"NPR",
        status:"pending",payment_status:"pending",service_price:10,service_currency:"NPR"}]};
      if (sql.includes("INSERT INTO public.payment_checkout_sessions")) return {rows:[{id:targetId}]};
      return {rows:[]};
    });
    await new NeonCheckoutService(provider()).initiate(actor,"mentor_booking",targetId,"http://localhost:3210",
      {query} as unknown as Pick<PoolClient,"query">);
    const statements=query.mock.calls.map(([sql])=>sql);
    expect(statements[0]).toContain("FOR SHARE OF a,l,p");
    const expiry=statements.findIndex(sql=>sql.includes("expires_at<=now()"));
    const insertion=statements.findIndex(sql=>sql.includes("INSERT INTO public.payment_checkout_sessions"));
    expect(expiry).toBeGreaterThan(0);
    expect(expiry).toBeLessThan(insertion);
  });
});
