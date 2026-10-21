import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preserveApprovedOwnerRole} from './candidate-owner-exceptions.mjs';
const row={id:'stable-role-id',user_id:'verified-owner',role:'talent',created_at:'2026-01-01T00:00:00+00:00'};
const input={table:'user_roles',sourceRows:[JSON.stringify(row)],targetRows:[JSON.stringify({...row,role:'admin'})],ownerId:'verified-owner'};
test('only the approved role field changes in the desired comparison, never source records',()=>{
  const result=preserveApprovedOwnerRole(input);assert.equal(result.approvedExceptions,1);assert.equal(JSON.parse(result.rows[0]).role,'admin');assert.equal(JSON.parse(input.sourceRows[0]).role,'talent');
});
test('wrong owner, role ID, other field or elevated target role fails closed',()=>{
  for(const changed of [{...row,id:'other',role:'admin'},{...row,role:'admin',created_at:'different'},{...row,role:'super_admin'},{...row,user_id:'someone-else',role:'admin'}]){
    assert.throws(()=>preserveApprovedOwnerRole({...input,targetRows:[JSON.stringify(changed)]}),/UNREVIEWED_OWNER_ROLE/);
  }
});
test('unrelated tables have no exception',()=>assert.deepEqual(preserveApprovedOwnerRole({...input,table:'profiles'}),{rows:input.sourceRows,approvedExceptions:0}));
