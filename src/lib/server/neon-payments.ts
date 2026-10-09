/**
 * Neon staging Payments repository and service.
 * Enforces transaction integrity, idempotency, and guarded sandbox payments.
 */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";
import { appendNotificationEvent } from "./neon-application-events";

export interface PaymentRecordRow extends QueryResultRow {
  id: string;
  user_id: string;
  payment_type: string;
  reference_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  gateway: string | null;
  transaction_id: string | null;
  gateway_transaction_id: string | null;
  metadata: unknown;
  created_at: Date;
  paid_at: Date | null;
}

export interface CreatePaymentInput {
  paymentType: "event_ticket" | "mentor_booking" | "subscription" | "course";
  referenceId?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  gateway?: string;
  metadata?: Record<string, unknown>;
}

import { randomUUID } from "node:crypto";

export class NeonPaymentsRepository {
  constructor(private readonly db: NeonQueryExecutor = neonQueryExecutor) {}

  async createPayment(
    actor: NeonActor,
    input: CreatePaymentInput,
  ): Promise<PaymentRecordRow> {
    if (input.amount <= 0) {
      throw new NeonAuthorizationError(400, "INVALID_AMOUNT", "Payment amount must be greater than zero.");
    }

    const referenceId = input.referenceId || randomUUID();

    const rows = await this.db.query<PaymentRecordRow>(`
      INSERT INTO public.payments (
        user_id, payment_type, reference_id, amount, currency,
        status, payment_method, gateway, metadata, created_at
      ) VALUES (
        $1::uuid, $2, $3::uuid, $4, $5,
        'pending', $6, $7, $8::jsonb, now()
      ) RETURNING id, user_id, payment_type, reference_id, amount::float AS amount,
                  currency, status, payment_method, gateway, transaction_id,
                  gateway_transaction_id, metadata, created_at, paid_at`, [
      actor.userId,
      input.paymentType,
      referenceId,
      input.amount,
      input.currency ?? "NPR",
      input.paymentMethod ?? "esewa",
      input.gateway ?? "esewa",
      JSON.stringify(input.metadata ?? {}),
    ]);

    return rows[0];
  }

  async verifyPaymentCallback(
    actor: NeonActor,
    paymentId: string,
    verification: {
      gatewayTransactionId: string;
      status: "completed" | "failed";
      failureReason?: string;
    },
    transactionClient?: Pick<PoolClient, "query">,
  ): Promise<PaymentRecordRow> {
    const runWith = async (client: Pick<PoolClient, "query">) => {
      const rows = await client.query<{
        id: string;
        user_id: string;
        payment_type: string;
        reference_id: string | null;
        amount: number;
        status: string;
      }>(`
        SELECT id, user_id, payment_type, reference_id, amount::float AS amount, status
        FROM public.payments
        WHERE id = $1::uuid AND deleted_at IS NULL FOR UPDATE`, [paymentId]);

      const payment = rows.rows[0];
      if (!payment) {
        throw new NeonAuthorizationError(404, "PAYMENT_NOT_FOUND", "Payment record not found.");
      }

      if (payment.user_id !== actor.userId && !actor.platformAdmin) {
        throw new NeonAuthorizationError(403, "PAYMENT_FORBIDDEN", "You cannot verify this payment.");
      }

      if (payment.status === "completed") {
        const current = await client.query<PaymentRecordRow>(`
          SELECT id, user_id, payment_type, reference_id, amount::float AS amount,
                 currency, status, payment_method, gateway, transaction_id,
                 gateway_transaction_id, metadata, created_at, paid_at
          FROM public.payments WHERE id = $1::uuid`, [paymentId]);
        return current.rows[0];
      }

      const isSuccess = verification.status === "completed";
      const updated = await client.query<PaymentRecordRow>(`
        UPDATE public.payments
        SET status = $2,
            gateway_transaction_id = $3,
            paid_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END,
            failed_at = CASE WHEN $2 = 'failed' THEN now() ELSE NULL END,
            failure_reason = $4,
            updated_at = now()
        WHERE id = $1::uuid
        RETURNING id, user_id, payment_type, reference_id, amount::float AS amount,
                  currency, status, payment_method, gateway, transaction_id,
                  gateway_transaction_id, metadata, created_at, paid_at`, [
        paymentId,
        verification.status,
        verification.gatewayTransactionId,
        verification.failureReason ?? null,
      ]);

      // If tied to event registration or mentor booking, update associated record
      if (isSuccess && payment.reference_id) {
        if (payment.payment_type === "event_ticket") {
          await client.query(`
            UPDATE public.event_registrations
            SET status = 'confirmed', payment_status = 'completed', payment_id = $1::uuid, updated_at = now()
            WHERE id = $2::uuid`, [paymentId, payment.reference_id]);
        } else if (payment.payment_type === "mentor_booking") {
          await client.query(`
            UPDATE public.mentor_bookings
            SET status = 'confirmed', payment_status = 'completed', payment_id = $1::uuid, updated_at = now()
            WHERE id = $2::uuid`, [paymentId, payment.reference_id]);
        }
      }

      // Append notification & event
      const notif = await client.query<{ id: string }>(`
        INSERT INTO public.notifications (recipient_id, title, message, type, is_read)
        VALUES ($1::uuid, $2, $3, 'payment_status', false)
        RETURNING id`, [
        payment.user_id,
        isSuccess ? "Payment Successful" : "Payment Failed",
        isSuccess
          ? `Your payment of NPR ${payment.amount} has been successfully processed.`
          : `Your payment was not completed: ${verification.failureReason || "Transaction declined."}`,
      ]);

      await appendNotificationEvent(client, payment.user_id, notif.rows[0].id);

      return updated.rows[0];
    };

    if (transactionClient) return runWith(transactionClient);
    return withTransaction(runWith);
  }

  async listOwnPayments(actor: NeonActor): Promise<PaymentRecordRow[]> {
    return this.db.query<PaymentRecordRow>(`
      SELECT id, user_id, payment_type, reference_id, amount::float AS amount,
             currency, status, payment_method, gateway, transaction_id,
             gateway_transaction_id, metadata, created_at, paid_at
      FROM public.payments
      WHERE user_id = $1::uuid AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50`, [actor.userId]);
  }
}
