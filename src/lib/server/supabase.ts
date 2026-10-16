import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ServerConfigurationError } from "./server-configuration-error";
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
  const url = getSupabaseUrl();
  const secretKey = getSecretKey();

  if (
    cachedAdminClient?.url === url &&
    cachedAdminClient.secretKey === secretKey
  ) {
    return cachedAdminClient.client;
  }

  const client = createClient(url, secretKey, {
    auth: serverAuthOptions,
    global: { headers: { "X-Client-Info": "merotalent-server-admin" } },
  });
  cachedAdminClient = { url, secretKey, client };
  return client;
}

export function getUserClient(accessToken: string): SupabaseClient {
  if (!accessToken) {
    throw new ServerConfigurationError(
      "A user access token is required for the Supabase client.",
    );
  }

  return createClient(getSupabaseUrl(), getPublishableKey(), {
    auth: serverAuthOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Client-Info": "merotalent-server-user",
      },
    },
  });
}
