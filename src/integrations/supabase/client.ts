import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// No legacy SDK instance, environment requirement, session store, refresh timer
// or realtime socket exists in Neon mode. This is a denial boundary, not a
// Supabase-compatible Neon query adapter. Recovery owns its separate proof-only
// client in lib/auth/legacy-recovery.ts until historical ownership is resolved.
// Keep the public mode literals at this build boundary: Next replaces them at
// build time and can exclude the legacy require from a Neon application entry.
// This hint never grants access; the server still enforces its selected runtime.
let selectedClient: SupabaseClient<Database>;
if (process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging" ||
    process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-production") {
  selectedClient = new Proxy({} as SupabaseClient<Database>, {
    get(_target, property) {
      if (["channel", "removeChannel", "removeAllChannels"].includes(String(property))) {
        throw new Error("Legacy realtime is disabled in Neon mode.");
      }
      throw new Error("Legacy application data access is disabled in Neon mode. Use the authorized Neon API.");
    },
  });
} else {
  // The synchronous legacy interface is retained only for explicit legacy mode.
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  selectedClient = createClient<Database>(url, key);
}
export const supabase = selectedClient;
