import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
describe('patched Next runtime baseline', () => {
  it('keeps framework and lint configuration on the reviewed 16.4.2 release', () => {
    const pkg = JSON.parse(readFileSync('package.json','utf8'));
    const lock = JSON.parse(readFileSync('package-lock.json','utf8'));
    expect(pkg.dependencies.next).toBe('16.4.2');
    expect(pkg.devDependencies['eslint-config-next']).toBe('16.4.2');
    expect(lock.packages['node_modules/next'].version).toBe('16.4.2');
    expect(lock.packages['node_modules/eslint-config-next'].version).toBe('16.4.2');
  });
});
