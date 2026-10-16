import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { listMyCompetitionIds, listPublicCompetitions, parseCompetitionRegistration,
  registerNeonCompetition } from "@/lib/server/neon-competitions";

const actor: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["talent"],
  permissions: [], platformAdmin: false };
const competitionId = "30000000-0000-4000-8000-000000000003";

describe("Neon competitions contract", () => {
  it("uses the actual image column and only public non-expired competitions", async () => {
    const query = vi.fn().mockResolvedValue([]);
    await listPublicCompetitions(12, 0, query);
    expect(query.mock.calls[0][0]).toContain("cover_image AS cover_image_url");
    expect(query.mock.calls[0][0]).toContain("end_date >= now()");
    await expect(listPublicCompetitions(0, 0, query)).rejects.toMatchObject({ code: "INVALID_PAGINATION" });
  });

  it("reads only the authenticated student's registrations from the actual schema", async () => {
    const query = vi.fn().mockResolvedValue([{ competition_id: competitionId }]);
    expect(await listMyCompetitionIds(actor, query)).toEqual([competitionId]);
    expect(query.mock.calls[0][0]).toContain("registered_at");
    expect(query.mock.calls[0][0]).not.toContain("deleted_at");
    expect(query.mock.calls[0][1]).toEqual([actor.userId]);
  });

  it("rejects malformed IDs and team names before a write", () => {
    expect(() => parseCompetitionRegistration({ competitionId: "x" })).toThrow();
    expect(() => parseCompetitionRegistration({ competitionId, teamName: "x\n" })).toThrow();
    expect(parseCompetitionRegistration({ competitionId, teamName: " Team " }))
      .toEqual({ competitionId, teamName: "Team" });
  });

  it("never reports a successful registration when the insert returned no row", async () => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: competitionId, status: "upcoming",
        registration_deadline: null, end_date: null, max_participants: null,
        is_team_based: false }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) };
    const run = vi.fn(async callback => callback(client));
    await expect(registerNeonCompetition(actor, { competitionId }, run))
      .rejects.toMatchObject({ code: "REGISTRATION_CONFLICT" });
  });

  it("blocks closed and full competitions before insertion", async () => {
    const closed = { query: vi.fn().mockResolvedValue({ rows: [{ id: competitionId,
      status: "completed", registration_deadline: null, end_date: null,
      max_participants: null, is_team_based: false }] }) };
    await expect(registerNeonCompetition(actor, { competitionId }, async callback => callback(closed as unknown as PoolClient)))
      .rejects.toMatchObject({ code: "REGISTRATION_CLOSED" });
    expect(closed.query).toHaveBeenCalledTimes(1);
    const full = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: competitionId, status: "upcoming",
        registration_deadline: null, end_date: null, max_participants: 2,
        is_team_based: false }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: "2" }] }) };
    await expect(registerNeonCompetition(actor, { competitionId }, async callback => callback(full as unknown as PoolClient)))
      .rejects.toMatchObject({ code: "COMPETITION_FULL" });
    expect(full.query).toHaveBeenCalledTimes(3);
  });
});
