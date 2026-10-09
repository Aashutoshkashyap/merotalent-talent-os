/**
 * Experimental self-hosted Better Auth draft — NOT the Neon Managed Auth runtime.
 *
 * Retained for review only; no API route mounts this instance. The target is
 * Neon's branch-scoped Managed Auth endpoint, and legacy production still uses
 * Supabase Auth. This draft explores:
 *   - Session validation (JWT verification)
 *   - Email/password sign-in and sign-up
 *   - Google OAuth
 *   - Password reset
 *   - Admin user management
 *
 * Do not call this draft from application authorization or route handlers.
 *
 * Environment variables required:
 *   BETTER_AUTH_SECRET        — 32+ byte random secret (HMAC signing key)
 *   BETTER_AUTH_URL           — App origin, e.g. https://merotalent.com
 *   NEON_DATABASE_URL         — Neon Postgres connection string
 *   GOOGLE_CLIENT_ID          — OAuth 2.0 client ID
 *   GOOGLE_CLIENT_SECRET      — OAuth 2.0 client secret
 */

import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";
import { getTransactionalEmailProvider } from "./email-provider";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Lazily initialised Better Auth instance.
 * Singleton is safe — Better Auth is stateless.
 */
function createAuthInstance() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("NEON_DATABASE_URL is not configured. Better Auth requires a Neon database.");
  }

  const appUrl =
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set to a 32+ character random string.",
    );
  }

  const emailProvider = getTransactionalEmailProvider();

  const instance = betterAuth({
    database: new Pool({ connectionString: databaseUrl }),
    secret,
    baseURL: appUrl,
    basePath: "/api/auth",

    // -------------------------------------------------------------------------
    // Email/password
    // -------------------------------------------------------------------------
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await emailProvider.send({
          event: "access_request_decision",
          to: user.email,
          subject: "Reset your MeroTalent password",
          text: `Reset your password by clicking the link below:\n\n${url}\n\nThis link expires in 1 hour.`,
          html: `<p>Reset your password by clicking the link below:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour.</p>`,
        });
      },
      sendVerificationEmail: async ({ user, url }) => {
        await emailProvider.send({
          event: "access_request_decision",
          to: user.email,
          subject: "Verify your MeroTalent email",
          text: `Verify your email address:\n\n${url}`,
          html: `<p>Verify your email address by clicking:</p><p><a href="${url}">${url}</a></p>`,
        });
      },
    },

    // -------------------------------------------------------------------------
    // Google OAuth
    // -------------------------------------------------------------------------
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
    },

    // -------------------------------------------------------------------------
    // Session
    // -------------------------------------------------------------------------
    session: {
      expiresIn: 60 * 60 * 24 * 7,         // 7 days
      updateAge: 60 * 60 * 24,              // Refresh if > 1 day old
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,                     // 5 min client-side cache
      },
    },

    // -------------------------------------------------------------------------
    // User schema extensions
    // -------------------------------------------------------------------------
    user: {
      additionalFields: {
        // Stable link back to the Supabase UUID for the transition period.
        // Allows looking up profile, roles, and permissions from Neon tables
        // that still reference the original Supabase user IDs.
        legacySupabaseId: {
          type: "string",
          required: false,
          defaultValue: null,
        },
      },
    },
  });

  return instance;
}

// This self-hosted prototype is intentionally not mounted by any route.
// Neon Managed Auth is the staging target; retain the draft only for review.
let _auth: ReturnType<typeof createAuthInstance> | undefined;

export function getAuth() {
  return _auth ??= createAuthInstance();
}

/**
 * Type alias for the Better Auth instance.
 * Import this where you need full IDE type support.
 */
export type Auth = ReturnType<typeof createAuthInstance>;
