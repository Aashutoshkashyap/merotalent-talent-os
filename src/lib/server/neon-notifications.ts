/** Own-recipient notification reads and writes for isolated Neon staging. */
import type { QueryResultRow } from "pg";
import {
  NeonAuthorizationError, neonQueryExecutor,
  type NeonActor, type NeonQueryExecutor,
} from "./neon-authorization";

export interface NeonNotification {
  id: string;
  title: string;
  message: string;
  type: string | null;
  category: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationResult extends QueryResultRow {
  allowed: boolean;
  notifications: NeonNotification[];
  unread_count: number;
}

const ownActiveLink = `
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.neon_application_accounts a ON a.legacy_user_id = p.user_id
    JOIN public.neon_identity_links l ON l.application_account_id = a.id
    WHERE p.user_id = $1::uuid AND p.account_status = 'active' AND p.deleted_at IS NULL
      AND a.status = 'active' AND l.status = 'verified'
      AND l.neon_auth_user_id = $2::uuid
  )`;

/** This snapshot never accepts a browser-supplied recipient ID. */
export async function listOwnNotifications(
  actor: NeonActor,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<{ notifications: NeonNotification[]; unreadCount: number }> {
  const [result] = await db.query<NotificationResult>(`
    WITH access AS (SELECT ${ownActiveLink} AS allowed),
    recent AS (
      SELECT n.id, n.title, n.message, n.type, n.category, n.is_read,
             n.action_url, n.created_at
      FROM public.notifications n, access a
      WHERE a.allowed AND n.recipient_id = $1::uuid
      ORDER BY n.created_at DESC, n.id DESC LIMIT 50
    )
    SELECT access.allowed,
      COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC, r.id DESC)
                FROM recent r), '[]'::jsonb) AS notifications,
      (SELECT count(*)::int FROM public.notifications n
       WHERE access.allowed AND n.recipient_id = $1::uuid AND n.is_read = false) AS unread_count
    FROM access`, [actor.userId, actor.neonAuthUserId]);
  if (!result?.allowed) {
    throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "The identity link is inactive.");
  }
  return { notifications: result.notifications, unreadCount: result.unread_count };
}

/** Atomic recipient/link check and mutation, including a revoked-link race. */
export async function markOwnNotificationsRead(
  actor: NeonActor,
  notificationId: string | null,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<number> {
  const rows = await db.query<{ id: string }>(`
    UPDATE public.notifications n SET is_read = true
    WHERE n.recipient_id = $1::uuid AND n.is_read = false
      AND ($3::uuid IS NULL OR n.id = $3::uuid)
      AND ${ownActiveLink}
    RETURNING n.id`, [actor.userId, actor.neonAuthUserId, notificationId]);
  return rows.length;
}
