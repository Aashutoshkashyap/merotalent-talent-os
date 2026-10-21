import {test} from 'node:test';import assert from 'node:assert/strict';
import {stagingUatOrigin} from './staging-uat-origin.mjs';
test('allows only the two approved local staging origins',()=>{
 assert.equal(stagingUatOrigin({}),'http://localhost:3210');
 assert.equal(stagingUatOrigin({NEON_STAGING_UAT_APP_ORIGIN:'http://localhost:3001'}),'http://localhost:3001');
});
test('rejects remote, production, credential-bearing and path-bearing origins before authentication',()=>{
 for(const origin of ['https://www.merotalent.com','https://attacker.test','http://localhost:3001.attacker.test','http://user:secret@localhost:3001','http://localhost:3001/path','http://localhost:3001#fragment','http://127.0.0.1:3001',''])
 assert.throws(()=>stagingUatOrigin({NEON_STAGING_UAT_APP_ORIGIN:origin}),/ISOLATED_LOCAL_UAT_ORIGIN_REQUIRED/);
});
