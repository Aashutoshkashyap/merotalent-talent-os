import type { PaymentAvailability } from '@/lib/payments/payment-availability';
import { neonPaidInitiationState } from './neon-paid-initiation';
import { stagingEsewaProvider } from './neon-checkout';

/** The same rollout gate and decrypted provider used by actual checkout.
 * No network payment is attempted, and no merchant or secret data is returned.
 */
export async function getNeonPaymentAvailability(userId: string): Promise<PaymentAvailability> {
  const gate = neonPaidInitiationState(userId);
  if (!gate.allowed) return {
    available: false, mode: gate.mode,
    reason: gate.mode === 'owner_validation' ? 'owner_validation' : 'payments_disabled',
    message: gate.mode === 'owner_validation'
      ? 'eSewa is currently limited to the designated live-validation account. Public checkout has not been enabled. No charge was created.'
      : 'Online payments are currently paused by the platform. Existing access and transaction history remain available.',
  };
  try {
    await stagingEsewaProvider();
    return { available: true, mode: gate.mode, reason: 'available', message: gate.mode === 'owner_validation'
      ? 'eSewa checkout is available to your live-validation account only.' : 'eSewa checkout is available.' };
  } catch {
    return { available: false, mode: gate.mode, reason: 'provider_unavailable',
      message: 'eSewa checkout is temporarily unavailable. The platform must check its payment provider configuration. No charge was created.' };
  }
}
