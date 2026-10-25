import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { recordNeonPaymentReceipt } from '@/lib/server/neon-payment-receipt';
describe('atomic verified payment receipts', () => {
  it('reuses dashboard receipts and queues policy-scoped email, never claims delivery', async () => {
    const query = vi.fn(async (_sql: string) => ({rows:[],rowCount:1}));
    await recordNeonPaymentReceipt({query} as unknown as Pick<PoolClient,'query'>,'10000000-0000-4000-8000-000000000001');
    expect(query.mock.calls).toHaveLength(4);
    const sql = query.mock.calls.map(([sql]) => sql as string).join('\n');
    expect(sql).toContain("p.status IN ('success','failed','refunded')");
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain('delivery_environment');
    expect(sql).toContain('authoritative_provider_lookup');
    expect(sql).toContain('registration.attendee_count');
    expect(sql).toContain('service.title');
    expect(sql).toContain('access expiry');
    expect(sql).not.toContain("'sent'");
    expect(sql).not.toContain("'pending'");
  });
});
