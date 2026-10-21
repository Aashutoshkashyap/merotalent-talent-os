import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readEsewaEnvironment } from './esewa-environment.mjs';
const env = { ESEWA_ENVIRONMENT: 'sandbox', ESEWA_MERCHANT_CODE: 'EPAYTEST', ESEWA_SECRET_KEY: 'test-only-secret' };

test('maps reference sandbox terminology to the existing UAT environment', () => {
  const config = readEsewaEnvironment(env, 'uat');
  assert.equal(config.environment, 'uat');
  assert.equal(config.merchantCode, 'EPAYTEST');
});
test('accepts the reference implementation merchant-ID alias', () => {
  assert.equal(readEsewaEnvironment({ ...env, ESEWA_MERCHANT_CODE: undefined, ESEWA_MERCHANT_ID: 'EPAYTEST' }).merchantCode, 'EPAYTEST');
});
test('rejects conflicting aliases without exposing their values', () => {
  assert.throws(() => readEsewaEnvironment({ ...env, ESEWA_MERCHANT_ID: 'other' }), /^Error: ESEWA_MERCHANT_ALIASES_CONFLICT$/);
});
test('requires explicit environment and secret, never falls back to sandbox', () => {
  assert.throws(() => readEsewaEnvironment({ ...env, ESEWA_ENVIRONMENT: undefined }));
  assert.throws(() => readEsewaEnvironment({ ...env, ESEWA_SECRET_KEY: undefined }));
});
test('rejects mixed environments, test production credentials and arbitrary URL overrides', () => {
  assert.throws(() => readEsewaEnvironment(env, 'production'));
  assert.throws(() => readEsewaEnvironment({ ...env, ESEWA_ENVIRONMENT: 'production' }));
  assert.throws(() => readEsewaEnvironment({ ...env, ESEWA_BASE_URL: 'https://example.com' }));
  assert.throws(() => readEsewaEnvironment({ ...env, ESEWA_BASE_URL: 'https://epay.esewa.com.np' }));
});
test('accepts explicit production settings without changing enablement', () => {
  const config = readEsewaEnvironment({ ESEWA_ENVIRONMENT: 'production', ESEWA_MERCHANT_CODE: 'merchant-example', ESEWA_SECRET_KEY: 'mock-production-secret' }, 'production');
  assert.equal(config.environment, 'production');
  assert.equal(Object.hasOwn(config, 'enabled'), false);
});
