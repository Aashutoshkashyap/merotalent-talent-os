/** Public discovery and student registrations on the isolated Neon runtime. */
import type { PoolClient } from "pg";
import { queryRows, withTransaction } from "./db";
import { type NeonActor, NeonAuthorizationError } from "./neon-authorization";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function listPublicCompetitions(limit: number, offset: number,
  query: typeof queryRows = queryRows) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isInteger(offset) || offset < 0) {
    throw new NeonAuthorizationError(400, "INVALID_PAGINATION", "Invalid competition pagination.");
  }
  return query<Record<string, unknown>>(`SELECT id,title,type,organizer_type,prize_pool,format,status,
    start_date,end_date,registration_deadline,max_participants,is_team_based,description,
    cover_image AS cover_image_url
    FROM public.competitions WHERE status IN ('upcoming','ongoing')
      AND (end_date IS NULL OR end_date >= now())
    ORDER BY start_date ASC NULLS LAST,created_at DESC,id DESC
    LIMIT $1 OFFSET $2`, [limit,offset]);
}

export async function listMyCompetitionIds(actor: NeonActor, query: typeof queryRows = queryRows) {
  const rows = await query<{ competition_id: string }>(`SELECT competition_id
    FROM public.competition_registrations WHERE user_id=$1::uuid
    ORDER BY registered_at DESC`, [actor.userId]);
  return rows.map(row => row.competition_id);
}

export function parseCompetitionRegistration(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new NeonAuthorizationError(400, "INVALID_REGISTRATION", "Choose a competition.");
  }
  const value = body as Record<string, unknown>;
  const competitionId = value.competitionId ?? value.competition_id;
  const teamName = value.teamName ?? value.team_name;
  if (typeof competitionId !== "string" || !uuid.test(competitionId) ||
      (teamName != null && (typeof teamName !== "string" || teamName.length > 120 ||
        /[\u0000-\u001f]/.test(teamName)))) {
    throw new NeonAuthorizationError(400, "INVALID_REGISTRATION", "Invalid competition registration.");
  }
  return { competitionId, teamName: typeof teamName === "string" ? teamName.trim() || null : null };
}

export async function registerNeonCompetition(actor: NeonActor, body: unknown,
  run: typeof withTransaction = withTransaction) {
  const { competitionId, teamName } = parseCompetitionRegistration(body);
  return run(async (client: PoolClient) => {
    const competition = (await client.query<{ id: string; status: string;
      registration_deadline: Date | null; end_date: Date | null; max_participants: number | null;
      is_team_based: boolean }>(`SELECT id,status,registration_deadline,end_date,max_participants,
        is_team_based FROM public.competitions WHERE id=$1::uuid FOR UPDATE`, [competitionId])).rows[0];
    if (!competition || !["upcoming", "ongoing"].includes(competition.status) ||
        (competition.end_date && competition.end_date.getTime() < Date.now()) ||
        (competition.registration_deadline && competition.registration_deadline.getTime() < Date.now())) {
      throw new NeonAuthorizationError(409, "REGISTRATION_CLOSED", "Registration is closed.");
    }
    if (competition.is_team_based && !teamName) {
      throw new NeonAuthorizationError(400, "TEAM_NAME_REQUIRED", "Enter a team name.");
    }
    const prior = (await client.query<{ id: string; competition_id: string; user_id: string;
      registered_at: Date }>(`SELECT id,competition_id,user_id,registered_at
      FROM public.competition_registrations WHERE competition_id=$1::uuid AND user_id=$2::uuid
      LIMIT 1`, [competitionId, actor.userId])).rows[0];
    if (prior) return { ...prior, alreadyRegistered: true };
    if (competition.max_participants != null) {
      const count = (await client.query<{ count: string }>(`SELECT count(*)::text AS count
        FROM public.competition_registrations WHERE competition_id=$1::uuid`, [competitionId])).rows[0];
      if (Number(count?.count ?? 0) >= competition.max_participants) {
        throw new NeonAuthorizationError(409, "COMPETITION_FULL", "This competition is full.");
      }
    }
    const created = (await client.query<{ id: string; competition_id: string; user_id: string;
      registered_at: Date }>(`INSERT INTO public.competition_registrations
        (competition_id,user_id,team_name) VALUES ($1::uuid,$2::uuid,$3)
        ON CONFLICT(competition_id,user_id) DO NOTHING
        RETURNING id,competition_id,user_id,registered_at`,
    [competitionId,actor.userId,teamName])).rows[0];
    if (!created) {
      throw new NeonAuthorizationError(409, "REGISTRATION_CONFLICT", "Registration changed; refresh and retry.");
    }
    return { ...created, alreadyRegistered: false };
  });
}
