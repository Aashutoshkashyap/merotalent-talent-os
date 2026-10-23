import type { SupabaseClient } from "@supabase/supabase-js";
import { ServerConfigurationError } from "./server-configuration-error";
import {getBackendMode} from './backend-mode';
export { ServerConfigurationError } from "./server-configuration-error";

if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
  throw new Error("Server-side Supabase utilities cannot run in the browser.");
}

interface CachedAdminClient {
  url: string;
  secretKey: string;
  client: SupabaseClient;
}

let cachedAdminClient: CachedAdminClient | undefined;

function getSupabaseUrl() {
  const value =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new ServerConfigurationError("The Supabase URL is not configured.");
  }
  return value;
}

function getPublishableKey() {
  const value =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) {
    throw new ServerConfigurationError(
      "The Supabase publishable key is not configured.",
    );
  }
  return value;
}

function getSecretKey() {
  const value = process.env.SUPABASE_SECRET_KEY;
  if (!value) {
    throw new ServerConfigurationError(
      "The server-side Supabase secret key is not configured.",
    );
  }
  return value;
}

const serverAuthOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
};

export function getAdminClient(): SupabaseClient {
  if(getBackendMode()!=='legacy')throw new ServerConfigurationError('Legacy database runtime is disabled in Neon mode.');
  const url = getSupabaseUrl();
  const secretKey = getSecretKey();

  if (
    cachedAdminClient?.url === url &&
    cachedAdminClient.secretKey === secretKey
  ) {
    return cachedAdminClient.client;
  }

  // Keep the synchronous compatibility API, but never evaluate the recovery/
  // legacy SDK on an ordinary Neon server path. The backend guard above must
  // run before this require, including when a cached legacy client exists.
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  const client = createClient(url, secretKey, {
    auth: serverAuthOptions,
    global: { headers: { "X-Client-Info": "merotalent-server-admin" } },
  });
  cachedAdminClient = { url, secretKey, client };
  return client;
}

export function getUserClient(accessToken: string): SupabaseClient {
  if(getBackendMode()!=='legacy')throw new ServerConfigurationError('Legacy database runtime is disabled in Neon mode.');
  if (!accessToken) {
    throw new ServerConfigurationError(
      "A user access token is required for the Supabase client.",
    );
  }

  const url = getSupabaseUrl();
  const key = getPublishableKey();
  const { createClient } = require("@supabase/supabase-js") as typeof import("@supabase/supabase-js");
  return createClient(url, key, {
    auth: serverAuthOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Client-Info": "merotalent-server-user",
      },
    },
  });
}
