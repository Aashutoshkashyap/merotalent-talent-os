/** Secret-free checkout readiness, shared by every paid product. */
export interface PaymentAvailability {
  available: boolean;
  mode: 'staging' | 'public' | 'owner_validation' | 'disabled';
  reason: 'available' | 'owner_validation' | 'payments_disabled' | 'provider_unavailable';
  message: string;
}
