/** Shared server configuration failure without importing either database SDK. */
export class ServerConfigurationError extends Error {
  readonly code = "SERVER_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "ServerConfigurationError";
  }
}
