import {getBackendMode} from './backend-mode';
import {NeonAuthorizationError} from './neon-authorization';

/** A controlled first live payment may be restricted to one verified actor.
 * This is server configuration, never a request field or a role/payment bypass.
 * Invalid validation configuration fails closed even if public payments are on.
 */
export function neonPaidInitiationAllowed(userId?: string){
  if(getBackendMode()!=='neon-production')return true;
  const validationUser=process.env.NEON_PRODUCTION_PAYMENT_VALIDATION_USER_ID;
  if(validationUser)return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(validationUser)
    && validationUser===userId;
  return process.env.NEON_PRODUCTION_PAYMENTS_ENABLED==='true';
}

/** Existing payment verification stays reachable; only new paid operations stop. */
export function requireNeonPaidInitiation(userId?: string){
  if(!neonPaidInitiationAllowed(userId)){
    throw new NeonAuthorizationError(503,'PAYMENTS_DISABLED','Online payments are temporarily unavailable. No paid reservation or charge was created.');
  }
}
