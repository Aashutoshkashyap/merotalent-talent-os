import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import {isNeonClientRuntime} from '@/lib/backend-selection';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

const neon=isNeonClientRuntime();
const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: !neon,
    autoRefreshToken: !neon,
    detectSessionInUrl: !neon,
  },
  global:{fetch:async(input,init)=>{
    if(neon){
      // This is a permanent local denial, not a transient network failure.
      // AbortError prevents PostgREST from retrying the prohibited request.
      throw new DOMException('Legacy application data access is disabled in Neon mode.','AbortError');
    }
    return fetch(input,init);
  }},
});
// Recovery has a separate non-persistent, proof-only client. Ordinary application
// code must not open legacy realtime sockets when a Neon session is selected.
export const supabase=neon?new Proxy(client,{get(target,key,receiver){
  if(['channel','removeChannel','removeAllChannels'].includes(String(key)))throw new Error('Legacy realtime is disabled in Neon mode.');
  return Reflect.get(target,key,receiver);
}}):client;
