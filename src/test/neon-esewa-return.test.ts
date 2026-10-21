import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({mode:'neon-production',verify:vi.fn(),legacy:vi.fn(),load:vi.fn()}));
vi.mock('@/lib/server/backend-mode',()=>({getBackendMode:()=>mocks.mode}));
vi.mock('@/lib/server/neon-checkout',()=>({NeonCheckoutService:class{verifyReturn=mocks.verify;}}));
vi.mock('@/lib/server/supabase',()=>({getAdminClient:mocks.legacy}));
vi.mock('@/lib/server/auth',()=>({authenticateRequest:vi.fn()}));
vi.mock('@/lib/server/provider-config-service',()=>({loadProviderSecret:mocks.load}));
vi.mock('@/lib/server/esewa-settlement',()=>({settleVerifiedCheckout:mocks.legacy}));
import {GET as canonical,POST as formReturn} from '../../app/api/v1/neon-staging/payments/esewa/return/route';
import {GET as compatibility} from '../../app/api/v1/payments/esewa/callback/route';
import {POST as legacyCheckout} from '../../app/api/v1/payments/checkout/route';
import {POST as legacyWebhook} from '../../app/api/v1/payments/webhook/route';
const ref='10000000-0000-4000-8000-000000000001';

beforeEach(()=>{vi.clearAllMocks();mocks.mode='neon-production';mocks.verify.mockResolvedValue({status:'pending'});});
describe('Neon eSewa callback boundaries',()=>{
  it.each([canonical,compatibility])('dispatches return to Neon, never Supabase, without asserting payment success',async route=>{
    const r=await route(new Request(`https://www.merotalent.test/return?reference=${ref}&state=failed`));
    expect(r.status).toBe(307);expect(r.headers.get('location')).toBe(`https://www.merotalent.test/dashboard/payments?checkout=${ref}`);
    expect(r.headers.get('cache-control')).toBe('no-store');expect(mocks.verify).toHaveBeenCalledWith({reference:ref,signedPayload:null});
    expect(mocks.legacy).not.toHaveBeenCalled();expect(mocks.load).not.toHaveBeenCalled();
  });
  it('accepts bounded URL-encoded callbacks through the same verifier',async()=>{
    const payload={transaction_uuid:ref,status:'COMPLETE'};
    const r=await formReturn(new Request('https://www.merotalent.test/return',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:Buffer.from(JSON.stringify(payload)).toString('base64')})}));
    expect(r.status).toBe(307);expect(mocks.verify).toHaveBeenCalledWith({reference:ref,signedPayload:payload});
  });
  it.each(['','W10=','not-base64','a'.repeat(4100)])('rejects malformed encoded callbacks before verification',async data=>{
    expect((await canonical(new Request(`https://www.merotalent.test/return?data=${encodeURIComponent(data)}`))).status).toBe(400);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('rejects oversized streamed form bodies and non-form content',async()=>{
    for(const [type,body] of [['application/json','{}'],['application/x-www-form-urlencoded','x'.repeat(16385)]]){
      expect((await formReturn(new Request('https://www.merotalent.test/return',{method:'POST',headers:{'content-type':type},body}))).status).toBe(400);
    }expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('returns a sanitized retryable error for provider timeouts',async()=>{
    mocks.verify.mockRejectedValue(new Error('private provider internals'));
    const r=await canonical(new Request(`https://www.merotalent.test/return?reference=${ref}`));
    expect(r.status).toBe(503);expect(await r.json()).toEqual({error:'VERIFICATION_UNAVAILABLE'});
  });
  it('rejects obsolete checkout/webhook writes before legacy authorization or database access',async()=>{
    for(const route of [legacyCheckout,legacyWebhook])expect((await route(new Request('https://www.merotalent.test/api',{method:'POST',body:'{}'}))).status).toBe(404);
    expect(mocks.legacy).not.toHaveBeenCalled();expect(mocks.load).not.toHaveBeenCalled();
  });
  it('does not expose Neon callbacks in legacy mode',async()=>{
    mocks.mode='legacy';expect((await canonical(new Request(`https://www.merotalent.test/return?reference=${ref}`))).status).toBe(404);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});
