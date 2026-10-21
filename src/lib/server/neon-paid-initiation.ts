import {getBackendMode} from './backend-mode';
import {NeonAuthorizationError} from './neon-authorization';

/** Existing payment verification stays reachable; only new paid operations stop. */
export function requireNeonPaidInitiation(){
  if(getBackendMode()==='neon-production'&&process.env.NEON_PRODUCTION_PAYMENTS_ENABLED!=='true'){
    throw new NeonAuthorizationError(503,'PAYMENTS_DISABLED','Online payments are temporarily unavailable. No paid reservation or charge was created.');
  }
}
