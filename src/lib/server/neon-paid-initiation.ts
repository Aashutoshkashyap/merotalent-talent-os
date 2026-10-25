import {getBackendMode} from './backend-mode';
import {NeonAuthorizationError} from './neon-authorization';

/** A controlled first live payment may be restricted to one verified actor.
 * This is server configuration, never a request field or a role/payment bypass.
 * Invalid validation configuration fails closed even if public payments are on.
 */
export function neonPaidInitiationState(userId?: string): {
  allowed: boolean; mode: 'staging' | 'public' | 'owner_validation' | 'disabled';
} {
  if(getBackendMode()!=='neon-production')return {allowed:true,mode:'staging'};
  const validationUser=process.env.NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID;
  if(validationUser)return {allowed:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validationUser)
    && validationUser===userId,mode:'owner_validation'};
  const allowed=process.env.NEON_PRODUCTION_PAYMENTS_ENABLED==='true';
  return {allowed,mode:allowed?'public':'disabled'};
}

export function neonPaidInitiationAllowed(userId?: string){
  return neonPaidInitiationState(userId).allowed;
}

/** Existing payment verification stays reachable; only new paid operations stop. */
export function requireNeonPaidInitiation(userId?: string){
  const state=neonPaidInitiationState(userId);
  if(!state.allowed){
    throw new NeonAuthorizationError(503,'PAYMENTS_DISABLED',state.mode==='owner_validation'
      ? 'eSewa is currently limited to the designated live-validation account. Public checkout has not been enabled. No charge was created.'
      : 'Online payments are currently paused by the platform. No paid reservation or charge was created.');
  }
}
