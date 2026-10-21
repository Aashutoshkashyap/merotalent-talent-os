import {test} from 'node:test';
import assert from 'node:assert/strict';
import {committedWriteJournal,replayCommittedWriteJournal} from './committed-write-replay.mjs';
const row=(id,message)=>JSON.stringify({id,message});
const input={table:'contact_queries',columns:['id','message'],keys:['id'],before:[row('a','before')],after:[row('a','after'),row('b','new')]};
test('journals committed inserts and exact before-image updates',()=>{
  const j=committedWriteJournal(input);assert.equal(j.operations.length,2);assert.equal(j.operations.find(o=>o.kind==='update').beforeRaw,row('a','before'));
});
test('does not silently replay deletions or unsafe names',()=>{
  assert.throws(()=>committedWriteJournal({...input,after:[]}),/DELETION_REPLAY/);
  assert.throws(()=>committedWriteJournal({...input,table:'contact_queries;DROP'}),/INVALID_REPLAY/);
});
test('replay refuses stale rows and duplicate inserts instead of overwriting',async()=>{
  const j=committedWriteJournal(input),calls=[];
  await assert.rejects(replayCommittedWriteJournal({query:async(sql,values)=>{calls.push({sql,values});return {rowCount:0};}},j),/REPLAY_CONFLICT_NO_OVERWRITE/);
  assert.ok(calls[0].sql.includes('to_jsonb(t)=$2::jsonb'));assert.equal(calls.length,1);
  const insertOnly=committedWriteJournal({...input,before:[],after:[row('b','new')]});
  await assert.rejects(replayCommittedWriteJournal({query:async()=>({rowCount:0})},insertOnly),/REPLAY_CONFLICT_NO_OVERWRITE/);
});
