import {afterEach,describe,it,expect,vi} from 'vitest';
import {getBackendMode} from '@/lib/server/backend-mode';
import {getAdminClient,getUserClient} from '@/lib/server/supabase';

afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();vi.resetModules();});
describe('no legacy application fallback in Neon mode',()=>{
  it.each(['neon-staging','neon-production'])('missing/legacy server selection with %s browser selection fails closed',mode=>{
    expect(()=>getBackendMode({NEXT_PUBLIC_MEROTALENT_BACKEND_MODE:mode})).toThrow('legacy fallback is prohibited');
    expect(()=>getBackendMode({MEROTALENT_BACKEND_MODE:'legacy',NEXT_PUBLIC_MEROTALENT_BACKEND_MODE:mode})).toThrow('legacy fallback is prohibited');
  });
  it('legacy server factories refuse Neon before accessing any URL/secret or cached client',()=>{
    vi.stubEnv('MEROTALENT_BACKEND_MODE','neon-production');vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE','neon-production');
    expect(()=>getAdminClient()).toThrow('Legacy database runtime is disabled');
    expect(()=>getUserClient('a-token')).toThrow('Legacy database runtime is disabled');
  });
  it('ordinary browser SDK cannot auto-refresh, fetch source rows, or open legacy realtime in Neon mode',async()=>{
    vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE','neon-production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://source.example.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','test-publishable-key');
    const network=vi.fn();vi.stubGlobal('fetch',network);
    try{
      const {supabase}=await import('@/integrations/supabase/client');
      expect(()=>supabase.auth.getSession()).toThrow('Legacy application data access is disabled');
      expect(()=>supabase.from('profiles').select('user_id')).toThrow('Legacy application data access is disabled');
      expect(()=>supabase.channel('unexpected')).toThrow('Legacy realtime is disabled');
      expect(network).not.toHaveBeenCalled();
    }finally{vi.unstubAllGlobals();}
  });
  it.each(['neon-staging','neon-production'])('Neon mode %s starts without source URL or key and never constructs a legacy SDK',async mode=>{
    vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE',mode);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');
    const network=vi.fn();vi.stubGlobal('fetch',network);
    try {
      const {supabase}=await import('@/integrations/supabase/client');
      expect(()=>supabase.storage).toThrow('Legacy application data access is disabled');
      expect(network).not.toHaveBeenCalled();
    } finally {vi.unstubAllGlobals();}
  });
});
