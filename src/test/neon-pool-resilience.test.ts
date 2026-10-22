import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ on: vi.fn(), query: vi.fn() }));
vi.mock("pg", () => ({ Pool: class { on = mocks.on; query = mocks.query; } }));
vi.mock("@/lib/neon/neon-config", () => ({ getNeonDatabaseConfig: () => ({ databaseUrl: "postgresql://user:secret@p-pooler.neon.tech/neondb" }) }));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Neon pool idle failure handling", () => {
  it("removes idle failure as a process-crash risk without leaking credentials or retrying writes", async () => {
    vi.stubGlobal("window", undefined);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getPool } = await import("@/lib/server/db");
    getPool();
    expect(mocks.on).toHaveBeenCalledWith("error", expect.any(Function));
    const handleError = mocks.on.mock.calls[0][1];
    expect(() => handleError(new Error("secret=DO_NOT_LOG"))).not.toThrow();
    expect(log).toHaveBeenCalledWith(JSON.stringify({ event: "neon_idle_connection_removed", retryWrites: false }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("DO_NOT_LOG");
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
