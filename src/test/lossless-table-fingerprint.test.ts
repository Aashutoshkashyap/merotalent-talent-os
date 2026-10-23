import { describe, expect, it, vi } from 'vitest';
import { losslessTableFingerprint } from '../../scripts/lossless-table-fingerprint.mjs';
describe('lossless source fingerprints', () => {
  it('does not round PostgreSQL microseconds or large numeric identifiers through JS', async () => {
    const query = vi.fn(async (_sql: string) => ({rows:[{row_text:'{"id":9007199254740993,"at":"2026-10-23T00:00:00.000001+00:00"}'}]}));
    const first = await losslessTableFingerprint({query}, 'public', 'example');
    query.mockResolvedValueOnce({rows:[{row_text:'{"id":9007199254740992,"at":"2026-10-23T00:00:00.000002+00:00"}'}]});
    expect((await losslessTableFingerprint({query}, 'public', 'example')).sha256).not.toBe(first.sha256);
    expect(query.mock.calls[0][0]).toContain('to_jsonb(t)::text');
    expect(query.mock.calls[0][0]).toContain('COLLATE "C"');
  });
  it('quotes identifiers and preserves duplicate rows', async () => {
    const query = vi.fn(async (_sql: string) => ({rows:[{row_text:'{}'}, {row_text:'{}'}]}));
    const result = await losslessTableFingerprint({query}, 'public', 'a"b');
    expect(query.mock.calls[0][0]).toContain('"public"."a""b"');
    expect(result.count).toBe(2);
  });
});
