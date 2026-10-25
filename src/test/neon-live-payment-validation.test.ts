import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { neonPaidInitiationAllowed, neonPaidInitiationState, requireNeonPaidInitiation } from '@/lib/server/neon-paid-initiation';
const owner='10000000-0000-4000-8000-000000000001';
beforeEach(()=>{vi.stubEnv('MEROTALENT_BACKEND_MODE','neon-production');vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE','neon-production');vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED','false');vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID','');});
afterEach(()=>vi.unstubAllEnvs());
describe('controlled first live payment',()=>{
  it('keeps ordinary production checkout disabled by default',()=>{expect(neonPaidInitiationAllowed(owner)).toBe(false);expect(()=>requireNeonPaidInitiation(owner)).toThrow();});
  it('admits only the exact configured authenticated actor, never an anonymous caller',()=>{
    vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID',owner);
    expect(neonPaidInitiationAllowed(owner)).toBe(true);expect(neonPaidInitiationAllowed()).toBe(false);
    expect(neonPaidInitiationAllowed('10000000-0000-4000-8000-000000000002')).toBe(false);
  });
  it.each(['*','admin',`${owner},other`,'invalid'])('fails closed for invalid validation identity %s',value=>{
    vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED','true');vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID',value);
    expect(neonPaidInitiationAllowed(owner)).toBe(false);
  });
  it('keeps the owner restriction even if public enablement is accidentally true',()=>{
    vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED','true');vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID',owner);
    expect(neonPaidInitiationAllowed('10000000-0000-4000-8000-000000000002')).toBe(false);
  });
  it('allows every verified actor only after explicit public enablement without an owner restriction',()=>{
    vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED','true');
    expect(neonPaidInitiationState(owner)).toEqual({allowed:true,mode:'public'});
    expect(neonPaidInitiationAllowed('10000000-0000-4000-8000-000000000002')).toBe(true);
  });
  it('explains owner validation without revealing the designated identity',()=>{
    vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID',owner);
    expect(neonPaidInitiationState('other')).toEqual({allowed:false,mode:'owner_validation'});
    try {requireNeonPaidInitiation('other');throw Error('Expected denial');}catch(error){
      expect(error).toMatchObject({code:'PAYMENTS_DISABLED'});
      expect((error as Error).message).toContain('Public checkout has not been enabled');
      expect((error as Error).message).not.toContain(owner);
    }
  });
});
