import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron authenticates requests with `Authorization: Bearer <CRON_SECRET>`.
 * Hashing both values before comparison keeps the timing-safe comparison fixed
 * length without ever logging or returning the configured secret.
 */
export function isValidCronAuthorization(
  authorizationHeader: string | null,
  cronSecret: string | undefined,
): boolean {
  if (!authorizationHeader || !cronSecret) return false;

  const actual = createHash("sha256").update(authorizationHeader).digest();
  const expected = createHash("sha256")
    .update(`Bearer ${cronSecret}`)
    .digest();

  return timingSafeEqual(actual, expected);
}
