/** Durable staging event access. Never take recipient identity from the browser. */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows } from "./db";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";

export interface NeonApplicationEvent extends QueryResultRow {
  id: string;
  kind: "notification" | "message";
  source_id: string;
  conversation_id: string | null;
}

export interface EventReader {
  query<T extends QueryResultRow>(sql: string, params: readonly unknown[]): Promise<T[]>;
}

export const neonEventReader: EventReader = { query: queryRows };

const membershipSql = `
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.mentors mentor ON mentor.id = c.mentor_id
    WHERE c.id = e.conversation_id AND c.is_active = true
      AND (c.mentee_id = $1::uuid OR mentor.user_id = $1::uuid)
  )`;

/** A caller cannot subscribe to an arbitrary conversation, even if no events exist yet. */
export async function requireConversationMembership(
  actor: NeonActor,
  conversationId: string,
  db: EventReader = neonEventReader,
): Promise<void> {
  const rows = await db.query<{ allowed: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.mentors mentor ON mentor.id = c.mentor_id
      WHERE c.id = $2::uuid AND c.is_active = true
        AND (c.mentee_id = $1::uuid OR mentor.user_id = $1::uuid)
    ) AS allowed`, [actor.userId, conversationId]);
  if (rows[0]?.allowed !== true) {
    throw new NeonAuthorizationError(403, "CONVERSATION_FORBIDDEN", "You cannot access this conversation.");
  }
}

/** Seek by stable bigint ID. A revoked conversation is excluded at read time. */
export async function listApplicationEvents(
  actor: NeonActor,
  afterId: string,
  conversationId: string | null,
  db: EventReader = neonEventReader,
): Promise<NeonApplicationEvent[]> {
  if (conversationId) await requireConversationMembership(actor, conversationId, db);
  return db.query<NeonApplicationEvent>(`
    SELECT e.id::text, e.kind, e.source_id, e.conversation_id
    FROM public.neon_application_events e
    WHERE e.recipient_user_id = $1::uuid AND e.id > $2::bigint
      AND ($3::uuid IS NULL OR e.conversation_id = $3::uuid)
      AND (e.kind = 'notification' OR ${membershipSql})
    ORDER BY e.id ASC LIMIT 50`, [actor.userId, afterId, conversationId]);
}

/** Call in the same transaction that creates the notification. */
export async function appendNotificationEvent(
  client: Pick<PoolClient, "query">,
  recipientUserId: string,
  notificationId: string,
): Promise<void> {
  const result = await client.query(`
    INSERT INTO public.neon_application_events (recipient_user_id, kind, source_id)
    SELECT n.recipient_id, 'notification', n.id FROM public.notifications n
    WHERE n.id = $2::uuid AND n.recipient_id = $1::uuid
    ON CONFLICT (kind, source_id, recipient_user_id) DO NOTHING
    RETURNING id`, [recipientUserId, notificationId]);
  if (result.rowCount === 1) return;
  const source = await client.query(`SELECT 1 FROM public.notifications
    WHERE id=$2::uuid AND recipient_id=$1::uuid`, [recipientUserId, notificationId]);
  if (source.rowCount !== 1) {
    throw new NeonAuthorizationError(403, "EVENT_RECIPIENT_MISMATCH", "Notification recipient mismatch.");
  }
}

/** Call in the same transaction that creates the message. */
export async function appendMessageEvent(
  client: Pick<PoolClient, "query">,
  recipientUserId: string,
  messageId: string,
): Promise<void> {
  const sourceSql = `
    SELECT m.receiver_id, m.conversation_id FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id AND c.is_active = true
    JOIN public.mentors mentor ON mentor.id = c.mentor_id
    WHERE m.id = $2::uuid AND m.receiver_id = $1::uuid
      AND (c.mentee_id = m.sender_id OR mentor.user_id = m.sender_id)
      AND (c.mentee_id = m.receiver_id OR mentor.user_id = m.receiver_id)`;
  const result = await client.query(`
    INSERT INTO public.neon_application_events
      (recipient_user_id, kind, source_id, conversation_id)
    SELECT source.receiver_id, 'message', $2::uuid, source.conversation_id
    FROM (${sourceSql}) source
    ON CONFLICT (kind, source_id, recipient_user_id) DO NOTHING
    RETURNING id`, [recipientUserId, messageId]);
  if (result.rowCount === 1) return;
  const source = await client.query(sourceSql, [recipientUserId, messageId]);
  if (source.rowCount !== 1) {
    throw new NeonAuthorizationError(403, "EVENT_RECIPIENT_MISMATCH", "Message recipient mismatch.");
  }
}
