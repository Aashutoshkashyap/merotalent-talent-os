/** Public routing hint only; server configuration and authorization remain authoritative. */
export function isNeonClientRuntime(): boolean {
  return process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging" ||
    process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-production";
}
