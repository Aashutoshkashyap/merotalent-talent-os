/** Conflict-checked business-row replay; never executes against a remote target here. */
import {planTableDelta} from './staging-snapshot-delta.mjs';
import {quoteIdentifier as q} from './recovery-integrity.mjs';
const valid=value=>typeof value==='string'&&/^[a-z][a-z0-9_]*$/.test(value);
export function committedWriteJournal({table,before,after,columns,keys}){
  if(!valid(table)||!columns.length||!keys.length||[...columns,...keys].some(c=>!valid(c))||keys.some(k=>!columns.includes(k)))throw Error('INVALID_REPLAY_IDENTIFIERS');
  const plan=planTableDelta({table,baseline:before,final:after,target:before,columns,keys});
  if(plan.conflicts.length||plan.targetOnly.length)throw Error('DELETION_REPLAY_REQUIRES_EXPLICIT_POLICY');
  const keyOf=raw=>JSON.stringify(keys.map(key=>JSON.parse(raw)[key]));
  const previous=new Map(before.map(raw=>[keyOf(raw),raw]));
  return {table,columns,keys,operations:plan.operations.map(operation=>({...operation,beforeRaw:operation.kind==='update'?previous.get(keyOf(operation.raw)):null}))};
}
/** Caller holds a transaction and target write lock; any conflict must roll back the whole journal. */
export async function replayCommittedWriteJournal(client,journal){
  const {table,columns,keys}=journal;
  // Validate again at execution, not only when creating the private journal.
  if(!valid(table)||!columns.length||!keys.length||[...columns,...keys].some(c=>!valid(c))||keys.some(k=>!columns.includes(k)))throw Error('INVALID_REPLAY_IDENTIFIERS');
  for(const operation of journal.operations){
    if(!['insert','update'].includes(operation.kind)||operation.kind==='update'&&!operation.beforeRaw)throw Error('INVALID_REPLAY_OPERATION');
    const record=`jsonb_populate_record(NULL::public.${q(table)},$1::jsonb) s`;
    const sql=operation.kind==='insert'
      ? `INSERT INTO public.${q(table)} (${columns.map(q).join(',')}) SELECT ${columns.map(c=>`s.${q(c)}`).join(',')} FROM ${record} ON CONFLICT DO NOTHING`
      : `UPDATE public.${q(table)} t SET ${columns.filter(c=>!keys.includes(c)).map(c=>`${q(c)}=s.${q(c)}`).join(',')} FROM ${record}
          WHERE ${keys.map(c=>`t.${q(c)} IS NOT DISTINCT FROM s.${q(c)}`).join(' AND ')} AND to_jsonb(t)=$2::jsonb`;
    const result=await client.query(sql,operation.kind==='insert'?[operation.raw]:[operation.raw,operation.beforeRaw]);
    if(result.rowCount!==1)throw Error('REPLAY_CONFLICT_NO_OVERWRITE');
  }
  return {insertions:journal.operations.filter(o=>o.kind==='insert').length,updates:journal.operations.filter(o=>o.kind==='update').length};
}
