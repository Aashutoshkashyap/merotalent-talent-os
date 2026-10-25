import { afterEach, describe, expect, it, vi } from 'vitest';
import { paymentErrorMessage, requireAvailableNeonPayment } from './browser-checkout';
afterEach(() => vi.unstubAllGlobals());
describe('payment readiness client', () => {
  it.each([
    [{ error: 'PAYMENTS_DISABLED', message: 'Public checkout has not been enabled.' }, 'Public checkout has not been enabled.'],
    [{ error: { code: 'PAYMENTS_DISABLED', message: 'Payments are paused.' } }, 'Payments are paused.'],
    [{ error: 'PAYMENTS_DISABLED' }, 'Retry checkout.'],
    [null, 'Retry checkout.'],
  ])('shows a useful error from either runtime envelope', (payload, message) => {
    expect(paymentErrorMessage(payload, 'Retry checkout.')).toBe(message);
  });
  it('checks fresh readiness rather than a previously loaded dashboard snapshot', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: { available: false, message: 'Owner validation only.' } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { available: true } })));
    vi.stubGlobal('fetch', fetcher);
    await expect(requireAvailableNeonPayment()).rejects.toThrow('Owner validation only.');
    await expect(requireAvailableNeonPayment()).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith('/api/v1/payments/availability', { credentials: 'same-origin', cache: 'no-store' });
  });
  it('fails closed for a malformed response and an expired session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('not json'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'AUTH_REQUIRED', message: 'Sign in again.' }), { status: 401 })));
    await expect(requireAvailableNeonPayment()).rejects.toThrow('Payment readiness could not be checked');
    await expect(requireAvailableNeonPayment()).rejects.toThrow('Sign in again.');
  });
});
