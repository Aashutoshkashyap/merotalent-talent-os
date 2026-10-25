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
  it.each([0.1,1.1,12.34])("compares decimal event totals in minor units (%s × 3)",async unit=>{
    const adapter=provider(),total=Math.round(unit*100)*3/100;
    const query=vi.fn(async(sql:string)=>{
      if(sql.includes('SELECT true AS allowed'))return{rows:[{allowed:true}]};
      if(sql.includes('SELECT r.user_id,r.total_amount'))return{rows:[{user_id:actor.userId,total_amount:total,ticket_quantity:3,
        status:'pending',payment_status:'pending',unit_price:unit,tier_currency:'NPR',event_price:0,event_currency:'NPR'}]};
      if(sql.includes('INSERT INTO public.payment_checkout_sessions'))return{rows:[{id:targetId}]};
      return{rows:[]};
    });
    await new NeonCheckoutService(adapter).initiate(actor,'event_registration',targetId,'http://localhost:3210',{query} as unknown as Pick<PoolClient,'query'>);
    expect(adapter.createCheckout).toHaveBeenCalledWith(expect.objectContaining({amount:total}));
  });
  it.each([1.1, 12.34, 1500])('accepts an authoritative two-decimal price %s', async amount => {
    const adapter = provider();
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT true AS allowed')) return { rows: [{ allowed: true }] };
      if (sql.includes('SELECT b.student_id')) return { rows: [{ student_id: actor.userId, amount,
        currency: 'NPR', status: 'pending', payment_status: 'pending', service_price: amount, service_currency: 'NPR' }] };
      if (sql.includes('INSERT INTO public.payment_checkout_sessions')) return { rows: [{ id: targetId }] };
      return { rows: [] };
    });
    await new NeonCheckoutService(adapter).initiate(actor, 'mentor_booking', targetId, 'http://localhost:3210',
      { query } as unknown as Pick<PoolClient, 'query'>);
    expect(adapter.createCheckout).toHaveBeenCalledOnce();
  });
  it('rejects a fractional-paisa authoritative price before creating payment', async () => {
    const adapter = provider();
    const query = vi.fn(async (sql: string) => ({ rows: sql.includes('SELECT true AS allowed') ? [{ allowed: true }]
      : [{ student_id: actor.userId, amount: 1.001, currency: 'NPR', status: 'pending', payment_status: 'pending', service_price: 1.001, service_currency: 'NPR' }] }));
    await expect(new NeonCheckoutService(adapter).initiate(actor, 'mentor_booking', targetId, 'http://localhost:3210',
      { query } as unknown as Pick<PoolClient, 'query'>)).rejects.toMatchObject({ code: 'INVALID_PRICE' });
    expect(adapter.createCheckout).not.toHaveBeenCalled();
  });
  it('rejects a different provider transaction code even when the redirect signature is valid',async()=>{
    const row={id:targetId,user_id:actor.userId,entity_type:'mentor_booking',entity_id:targetId,
      provider_reference:targetId,amount:10,currency:'NPR',status:'pending'};
    const query=vi.fn(async()=>({rows:[row]}));
    const adapter={verifyRedirectPayload:vi.fn(()=>true),lookupStatus:vi.fn(async()=>({status:'successful',transactionId:'provider-code'}))} as unknown as EsewaV2PaymentProvider;
    await expect(new NeonCheckoutService(adapter).verifyReturn({reference:targetId,signedPayload:{
      transaction_uuid:targetId,total_amount:'10.00',status:'COMPLETE',transaction_code:'different-signed-code',
      signed_field_names:'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names',
    }},{query} as unknown as Pick<PoolClient,'query'>)).rejects.toMatchObject({code:'PROVIDER_TRANSACTION_MISMATCH'});
    expect(query).toHaveBeenCalledOnce();
  });
  it('accepts a valid signed grouped amount but still waits for authoritative completion',async()=>{
    const row={id:targetId,user_id:actor.userId,entity_type:'mentor_booking',entity_id:targetId,
      provider_reference:targetId,amount:1000,currency:'NPR',status:'pending',expires_at:new Date(Date.now()+60000)};
    const query=vi.fn(async()=>({rows:[row]}));
    const lookupStatus=vi.fn(async()=>({status:'pending',transactionId:'fixture'}));
    const adapter={lookupStatus,verifyRedirectPayload:vi.fn(()=>true)} as unknown as EsewaV2PaymentProvider;
    expect(await new NeonCheckoutService(adapter).verifyReturn({reference:targetId,signedPayload:{
      transaction_uuid:targetId,total_amount:'1,000.0',status:'COMPLETE',
      signed_field_names:'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names',
    }},{query} as unknown as Pick<PoolClient,'query'>)).toMatchObject({status:'pending'});
    expect(lookupStatus).toHaveBeenCalledWith({reference:targetId,amount:1000,strict:true});
    expect(query).toHaveBeenCalledOnce();
  });
  it.each(['pending','refunded'])('never fulfills %s provider state',async status=>{
    const row={id:targetId,user_id:actor.userId,entity_type:'mentor_booking',entity_id:targetId,
      provider_reference:targetId,amount:10,currency:'NPR',status:'pending',expires_at:new Date(Date.now()+60000)};
    const query=vi.fn(async(sql:string)=>({rows:sql.startsWith('SELECT')?[row]:[],rowCount:1}));
    const adapter={lookupStatus:vi.fn(async()=>({status,transactionId:'fixture'}))} as unknown as EsewaV2PaymentProvider;
    expect(await new NeonCheckoutService(adapter).verifyReturn({reference:targetId},{query} as unknown as Pick<PoolClient,'query'>)).toMatchObject({status:'pending'});
    expect(query.mock.calls.some(([sql])=>sql.includes("SET status='confirmed'")||sql.includes('INSERT INTO public.event_tickets'))).toBe(false);
    if(status==='pending')expect(query.mock.calls).toHaveLength(1);
    else expect(query.mock.calls.some(([sql])=>sql.includes("reconciliation_status='disputed'"))).toBe(true);
  });
  it('does not mutate a checkout when provider verification fails',async()=>{
    const row={id:targetId,user_id:actor.userId,entity_type:'mentor_booking',entity_id:targetId,provider_reference:targetId,amount:10,currency:'NPR',status:'pending'};
    const query=vi.fn(async()=>({rows:[row]}));
    const adapter={lookupStatus:vi.fn(async()=>{throw Error('provider unavailable');})} as unknown as EsewaV2PaymentProvider;
    await expect(new NeonCheckoutService(adapter).verifyReturn({reference:targetId},{query} as unknown as Pick<PoolClient,'query'>)).rejects.toThrow('provider unavailable');
    expect(query).toHaveBeenCalledOnce();
  });
  it('completed checkout replay does not issue another booking or call the gateway',async()=>{
    const row={id:targetId,user_id:actor.userId,entity_type:'mentor_booking',entity_id:targetId,provider_reference:targetId,amount:10,currency:'NPR',status:'successful'};
    const query=vi.fn(async()=>({rows:[row]})),lookupStatus=vi.fn();
    expect(await new NeonCheckoutService({lookupStatus} as unknown as EsewaV2PaymentProvider).verifyReturn({reference:targetId},{query} as unknown as Pick<PoolClient,'query'>)).toEqual({status:'successful',duplicate:true});
    expect(lookupStatus).not.toHaveBeenCalled();expect(query).toHaveBeenCalledOnce();
  });
  it('rejects a signed response replayed against a different checkout before status lookup',async()=>{
    const query=vi.fn(),lookupStatus=vi.fn();
    const adapter={lookupStatus,verifyRedirectPayload:vi.fn(()=>true)} as unknown as EsewaV2PaymentProvider;
    await expect(new NeonCheckoutService(adapter).verifyReturn({reference:targetId,signedPayload:{transaction_uuid:actor.userId,signed_field_names:'transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names'}},{query} as unknown as Pick<PoolClient,'query'>)).rejects.toMatchObject({code:'INVALID_PROVIDER_SIGNATURE'});
    expect(query).not.toHaveBeenCalled();expect(lookupStatus).not.toHaveBeenCalled();
  });
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
