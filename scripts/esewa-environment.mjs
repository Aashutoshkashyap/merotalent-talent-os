/** Canonical server/operator configuration bridge for the supplied MrValuator flow.
 * No secret defaults, arbitrary gateway URLs, or implicit production selection.
 */
export function readEsewaEnvironment(env, expectedEnvironment) {
  const raw = env.ESEWA_ENVIRONMENT?.trim();
  const environment = raw === 'sandbox' ? 'uat' : raw;
  if (!['uat', 'production'].includes(environment) ||
      (expectedEnvironment && environment !== expectedEnvironment)) {
    throw new Error('ESEWA_ENVIRONMENT_INVALID_OR_MIXED');
  }
  const code = env.ESEWA_MERCHANT_CODE?.trim();
  const legacyId = env.ESEWA_MERCHANT_ID?.trim();
  if (code && legacyId && code !== legacyId) throw new Error('ESEWA_MERCHANT_ALIASES_CONFLICT');
  const merchantCode = code || legacyId;
  const secret = env.ESEWA_SECRET_KEY;
  if (!merchantCode || !/^[A-Za-z0-9-]{2,128}$/.test(merchantCode) ||
      typeof secret !== 'string' || !secret.trim() || secret !== secret.trim()) {
    throw new Error('ESEWA_CREDENTIALS_REQUIRED');
  }
  if ((environment === 'production' && (merchantCode === 'EPAYTEST' || secret === '8gBm/:&EnhH.1/q')) ||
      (environment === 'uat' && merchantCode !== 'EPAYTEST')) {
    throw new Error('ESEWA_TEST_AND_PRODUCTION_CREDENTIALS_MIXED');
  }
  // Reference .env.example uses BASE_URL, while its implementation ignores it.
  // Validate a supplied value rather than allowing it to redirect credentials.
  const checkoutUrl = environment === 'uat'
    ? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://epay.esewa.com.np/api/epay/main/v2/form';
  const base = env.ESEWA_BASE_URL?.trim();
  if (base && base !== checkoutUrl && base !== new URL(checkoutUrl).origin) {
    throw new Error('ESEWA_BASE_URL_INVALID_OR_MIXED');
  }
  return { environment, merchantCode, secret };
}
