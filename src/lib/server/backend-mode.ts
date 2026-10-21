/** Backend selection is server-only and never inferred from public env values. */
export type BackendMode = "legacy" | "neon-staging" | "neon-production";

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
  if (!configured || configured === "legacy") {
    if (env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === 'neon-staging' || env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === 'neon-production') {
      throw new BackendConfigurationError('Neon browser configuration requires an explicit matching server backend; legacy fallback is prohibited.');
    }
    return "legacy";
  }
  if (configured !== "neon-staging" && configured !== "neon-production") {
    throw new BackendConfigurationError("MEROTALENT_BACKEND_MODE is invalid.");
  }
  if (configured === "neon-staging" && env.VERCEL_ENV === "production") {
    throw new BackendConfigurationError(
      "Neon staging cannot run in a Vercel production deployment.",
    );
  }
  if (configured === "neon-production" && env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE !== "neon-production") {
    throw new BackendConfigurationError("Neon production requires matching browser and server backend configuration.");
  }
  return configured;
}

export function requireNeonBackend(env: Record<string, string | undefined> = process.env): void {
  if (getBackendMode(env) === "legacy") {
    throw new BackendConfigurationError("Neon data access requires neon-staging mode or neon-production mode.");
  }
}

export function requireNeonStaging(
  env: Record<string, string | undefined> = process.env,
): void {
  if (getBackendMode(env) !== "neon-staging") {
    throw new BackendConfigurationError("Neon data access requires neon-staging mode.");
  }
}
