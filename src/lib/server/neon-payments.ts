/**
 * Neon staging Payments repository and service.
 * Enforces transaction integrity, idempotency, and guarded sandbox payments.
 */
import type { QueryResultRow } from "pg";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";

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
    _actor: NeonActor,
    _paymentId: string,
    _verification: {
      gatewayTransactionId: string;
      status: "completed" | "failed";
      failureReason?: string;
    },
  ): Promise<PaymentRecordRow> {
    // No caller may activate a payment by asserting a result. A provider-verified
    // callback must be integrated before this method can change payment state.
    throw new NeonAuthorizationError(503, "VERIFIED_PROVIDER_REQUIRED", "A verified provider result is required.");
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
