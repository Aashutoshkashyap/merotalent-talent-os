import {afterEach,describe,it,expect,vi} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
describe('build browser/server selection and exact storage CSP',()=>{
  it.each(['legacy','neon-staging','neon-production'])('preserves the explicit %s backend in browser bundles',async mode=>{
    vi.stubEnv('MEROTALENT_BACKEND_MODE',mode);vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE',mode);vi.stubEnv('VERCEL_ENV',mode==='neon-staging'?'preview':'production');
    const {default:config}=await import('../../next.config');
    expect(config.env?.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE).toBe(mode);
    const headers=await config.headers!();const csp=headers[0].headers.find(header=>header.key==='Content-Security-Policy')!.value;
    const staging='br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech';
    const production='br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech';
    expect(csp.includes(staging)).toBe(mode==='neon-staging');expect(csp.includes(production)).toBe(mode==='neon-production');
    expect(csp).not.toContain('https://*.neon.tech');
  });
  it('refuses to build Neon browser assets against an absent server backend',async()=>{
    vi.stubEnv('MEROTALENT_BACKEND_MODE','');vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE','neon-production');
    await expect(import('../../next.config')).rejects.toThrow('legacy fallback is prohibited');
  });
});
