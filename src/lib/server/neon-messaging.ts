/**
 * Neon staging Messaging repository and service.
 * Enforces conversation membership, recipient isolation, and durable event stream delivery.
 */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";
import { appendMessageEvent, requireConversationMembership } from "./neon-application-events";

export interface ConversationSummaryRow extends QueryResultRow {
  id: string;
  mentor_id: string;
  mentee_id: string;
  is_active: boolean;
  other_user_id: string;
  other_name: string | null;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: Date | null;
  unread_count: number;
}

export interface MessageRow extends QueryResultRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: Date;
  attachment_path: string | null;
  attachment_mime_type: string | null;
}

export class NeonMessagingRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async listConversations(actor: NeonActor): Promise<ConversationSummaryRow[]> {
    return this.db.query<ConversationSummaryRow>(`
      SELECT c.id, c.mentor_id, c.mentee_id, c.is_active,
        CASE WHEN c.mentee_id = $1::uuid THEN mentor.user_id ELSE c.mentee_id END AS other_user_id,
        CASE WHEN c.mentee_id = $1::uuid THEN mp.full_name ELSE ep.full_name END AS other_name,
        CASE WHEN c.mentee_id = $1::uuid THEN mp.avatar_url ELSE ep.avatar_url END AS other_avatar,
        (SELECT m.content FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT m.created_at FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
        (SELECT count(*)::int FROM public.messages m WHERE m.conversation_id = c.id AND m.receiver_id = $1::uuid AND m.is_read = false) AS unread_count
      FROM public.conversations c
      JOIN public.mentors mentor ON mentor.id = c.mentor_id
      LEFT JOIN public.profiles mp ON mp.user_id = mentor.user_id
      LEFT JOIN public.profiles ep ON ep.user_id = c.mentee_id
      WHERE c.is_active = true AND (c.mentee_id = $1::uuid OR mentor.user_id = $1::uuid)
      ORDER BY COALESCE((SELECT max(m.created_at) FROM public.messages m WHERE m.conversation_id = c.id), c.created_at) DESC
      LIMIT 50`, [actor.userId]);
  }

  async listMessages(actor: NeonActor, conversationId: string): Promise<MessageRow[]> {
    await requireConversationMembership(actor, conversationId, this.db);
    return this.db.query<MessageRow>(`
      SELECT id, conversation_id, sender_id, receiver_id, content, is_read,
             created_at, attachment_path, attachment_mime_type
      FROM public.messages
      WHERE conversation_id = $1::uuid
      ORDER BY created_at ASC
      LIMIT 100`, [conversationId]);
  }

  async sendMessage(
    actor: NeonActor,
    conversationId: string,
    content: string,
    attachment?: { path: string; mimeType: string },
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<MessageRow> {
    const trimmed = content.trim();
    if (!trimmed && !attachment?.path) {
      throw new NeonAuthorizationError(400, "EMPTY_MESSAGE", "Message content or attachment is required.");
    }
    if (trimmed.length > 5000) {
      throw new NeonAuthorizationError(400, "MESSAGE_TOO_LONG", "Message cannot exceed 5,000 characters.");
    }

    const runWith = async (client: Pick<PoolClient, "query">) => {
      // 1. Authorize conversation and identify recipient
      const convRows = await client.query<{
        id: string;
        mentor_id: string;
        mentee_id: string;
        mentor_user_id: string;
      }>(`
        SELECT c.id, c.mentor_id, c.mentee_id, mentor.user_id AS mentor_user_id
        FROM public.conversations c
        JOIN public.mentors mentor ON mentor.id = c.mentor_id
        WHERE c.id = $1::uuid AND c.is_active = true FOR UPDATE`, [conversationId]);

      const conv = convRows.rows[0];
      if (!conv || (conv.mentee_id !== actor.userId && conv.mentor_user_id !== actor.userId)) {
        throw new NeonAuthorizationError(403, "CONVERSATION_FORBIDDEN", "You cannot post in this conversation.");
      }

      const receiverId = conv.mentee_id === actor.userId ? conv.mentor_user_id : conv.mentee_id;

      // 2. Insert message
      const msgInsert = await client.query<MessageRow>(`
        INSERT INTO public.messages (
          conversation_id, sender_id, receiver_id, content, is_read,
          attachment_path, attachment_mime_type, created_at
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4, false,
          $5, $6, now()
        ) RETURNING id, conversation_id, sender_id, receiver_id, content, is_read,
                    created_at, attachment_path, attachment_mime_type`, [
        conversationId,
        actor.userId,
        receiverId,
        trimmed || "Sent an attachment",
        attachment?.path ?? null,
        attachment?.mimeType ?? null,
      ]);

      const msg = msgInsert.rows[0];

      // 3. Update conversation timestamp
      await client.query(`UPDATE public.conversations SET updated_at = now() WHERE id = $1::uuid`, [conversationId]);

      // 4. Atomically append durable event for recipient
      await appendMessageEvent(client, receiverId, msg.id);

      return msg;
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async markConversationRead(actor: NeonActor, conversationId: string): Promise<number> {
    await requireConversationMembership(actor, conversationId, this.db);
    const result = await this.db.query<{ id: string }>(`
      UPDATE public.messages
      SET is_read = true, read_at = now()
      WHERE conversation_id = $1::uuid AND receiver_id = $2::uuid AND is_read = false
      RETURNING id`, [conversationId, actor.userId]);
    return result.length;
  }
}
