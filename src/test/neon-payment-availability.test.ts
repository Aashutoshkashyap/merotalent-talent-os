import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ provider: vi.fn() }));
vi.mock('@/lib/server/neon-checkout', () => ({ stagingEsewaProvider: mocks.provider }));
import { getNeonPaymentAvailability } from '@/lib/server/neon-payment-availability';
const owner = '10000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('MEROTALENT_BACKEND_MODE', 'neon-production');
  vi.stubEnv('NEXT_PUBLIC_MEROTALENT_BACKEND_MODE', 'neon-production');
  vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED', 'false');
  vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID', '');
  mocks.provider.mockResolvedValue({});
});
afterEach(() => vi.unstubAllEnvs());
describe('shared Neon checkout readiness', () => {
  it('distinguishes a release pause from provider configuration', async () => {
    expect(await getNeonPaymentAvailability(owner)).toMatchObject({ available: false, mode: 'disabled', reason: 'payments_disabled' });
    expect(mocks.provider).not.toHaveBeenCalled();
  });
  it('distinguishes owner-only validation from a broken gateway without leaking the owner ID', async () => {
    vi.stubEnv('NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID', owner);
    const result = await getNeonPaymentAvailability('other');
    expect(result).toMatchObject({ available: false, mode: 'owner_validation', reason: 'owner_validation' });
    expect(result.message).toContain('Public checkout has not been enabled');
    expect(JSON.stringify(result)).not.toContain(owner);
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(await getNeonPaymentAvailability(owner)).toMatchObject({ available: true, mode: 'owner_validation' });
  });
  it('reports the same provider readiness for public checkout in all modules', async () => {
    vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED', 'true');
    expect(await getNeonPaymentAvailability(owner)).toMatchObject({ available: true, mode: 'public', reason: 'available' });
    expect(mocks.provider).toHaveBeenCalledOnce();
  });
  it('fails closed when encryption, the enabled provider, or its environment is unavailable', async () => {
    vi.stubEnv('NEON_PRODUCTION_PAYMENTS_ENABLED', 'true');
    mocks.provider.mockRejectedValue(Error('private merchant configuration'));
    const result = await getNeonPaymentAvailability(owner);
    expect(result).toMatchObject({ available: false, reason: 'provider_unavailable' });
    expect(JSON.stringify(result)).not.toContain('private merchant');
  });
});
