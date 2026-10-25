import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: vi.fn(), readiness: vi.fn(), mode: 'neon-production' }));
vi.mock('@/lib/server/backend-mode', () => ({ getBackendMode: () => mocks.mode }));
vi.mock('@/lib/server/neon-session', async original => ({ ...await original<typeof import('@/lib/server/neon-session')>(), getAuthenticatedApplicationUser: mocks.actor }));
vi.mock('@/lib/server/neon-payment-availability', () => ({ getNeonPaymentAvailability: mocks.readiness }));
import { GET } from '../../app/api/v1/payments/availability/route';
import { NeonAuthorizationError } from '@/lib/server/neon-authorization';
const request = () => new Request('https://www.merotalent.test/api/v1/payments/availability?userId=forged&enabled=true');
beforeEach(() => { vi.clearAllMocks(); mocks.mode = 'neon-production'; mocks.actor.mockResolvedValue({ userId: 'trusted-actor' }); });
describe('payment readiness endpoint', () => {
  it('uses only the authenticated actor, ignores client assertions, and never caches readiness', async () => {
    mocks.readiness.mockResolvedValue({ available: true, mode: 'public', reason: 'available', message: 'eSewa checkout is available.' });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.readiness).toHaveBeenCalledWith('trusted-actor');
    expect(await response.json()).toEqual({ data: { available: true, mode: 'public', reason: 'available', message: 'eSewa checkout is available.' } });
  });
  it('denies anonymous users before reading provider configuration', async () => {
    mocks.actor.mockRejectedValue(new NeonAuthorizationError(401, 'AUTH_REQUIRED', 'Sign in'));
    expect((await GET(request())).status).toBe(401);
    expect(mocks.readiness).not.toHaveBeenCalled();
  });
  it('does not expose unexpected internal errors', async () => {
    mocks.readiness.mockRejectedValue(Error('private credentials'));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private credentials');
  });
  it('does not introduce a legacy runtime fallback', async () => {
    mocks.mode = 'legacy';
    expect((await GET(request())).status).toBe(404);
    expect(mocks.actor).not.toHaveBeenCalled();
  });
});
