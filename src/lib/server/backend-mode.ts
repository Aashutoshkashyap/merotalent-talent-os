/** Backend selection is server-only and never inferred from public env values. */
export type BackendMode = "legacy" | "neon-staging";

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

export function getBackendMode(
  env: Record<string, string | undefined> = process.env,
): BackendMode {
  const configured = env.MEROTALENT_BACKEND_MODE;
  if (!configured || configured === "legacy") return "legacy";
  if (configured !== "neon-staging") {
    throw new BackendConfigurationError("MEROTALENT_BACKEND_MODE is invalid.");
  }
  if (env.VERCEL_ENV === "production") {
    throw new BackendConfigurationError(
      "Neon staging cannot run in a Vercel production deployment.",
    );
  }
  return "neon-staging";
}

export function requireNeonStaging(
  env: Record<string, string | undefined> = process.env,
): void {
  if (getBackendMode(env) !== "neon-staging") {
    throw new BackendConfigurationError("Neon data access requires neon-staging mode.");
  }
}
