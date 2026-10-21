import {describe,it,expect,vi} from 'vitest';
import type {PoolClient} from 'pg';
import {prepareAssignedScopeRenewal,activateVerifiedAssignedScope} from '@/lib/server/neon-assigned-scope-renewal';
const ids={userId:'10000000-0000-4000-8000-000000000001',assignmentId:'20000000-0000-4000-8000-000000000002',packageId:'30000000-0000-4000-8000-000000000003',paymentId:'40000000-0000-4000-8000-000000000004'};
const scope={user_id:ids.userId,module_key:'college',entity_type:'college',entity_id:'50000000-0000-4000-8000-000000000005',package_id:ids.packageId,price:100,currency:'NPR',duration_days:7,billing_interval:'month',features:{ai_generation:true}};
const mock=(options:{scope?:unknown;paid?:boolean;duplicate?:boolean}={})=>{
  const query=vi.fn(async(sql:string)=>{
    if(sql.includes('SELECT a.user_id'))return {rows:options.scope===null?[]:[options.scope??scope]};
    if(sql.includes('FROM public.institutes WHERE'))return {rows:[{id:scope.entity_id}]};
    if(sql.includes('SELECT payment.id'))return {rows:options.paid===false?[]:[{id:ids.paymentId}]};
    if(sql.includes('SELECT id FROM public.module_entitlements'))return {rows:options.duplicate?[{id:'existing'}]:[]};
    if(sql.includes('AS expires_at'))return {rows:[{expires_at:new Date('2030-01-08T00:00:00Z')}]};
    if(sql.includes('INSERT INTO public.subscriptions'))return {rows:[{id:'subscription'}]};
    if(sql.includes('INSERT INTO public.module_entitlements'))return {rows:[{id:'entitlement'}]};
    return {rows:[]};
  });return {query,db:{query} as unknown as Pick<PoolClient,'query'>};
};
describe('assigned scope renewal authorization and activation',()=>{
  it('requires exact assignment owner, active capability and matching server plan in SQL',async()=>{
    const {db,query}=mock();expect(await prepareAssignedScopeRenewal(db,ids.userId,ids.assignmentId,ids.packageId)).toMatchObject({duration_days:7});
    const sql=query.mock.calls[0][0];
    for(const guard of ["a.user_id=$2::uuid","a.status='active'","umc.status='active'","umc.expires_at>now()","profile.account_status='active'","p.module_scope @> ARRAY[mc.module_key]","p.package_kind='paid'"])expect(sql).toContain(guard);
  });
  it('rejects absent/cross-user/revoked scope before payment writes',async()=>{
    const {db,query}=mock({scope:null});await expect(activateVerifiedAssignedScope(db,ids)).rejects.toMatchObject({code:'RENEWAL_SCOPE_REQUIRED'});
    expect(query).toHaveBeenCalledOnce();
  });
  it.each([{...scope,module_key:'jobs'},{...scope,duration_days:0},{...scope,duration_days:3651},{...scope,price:0},{...scope,currency:'USD'}])('rejects unsupported scope or invalid plan %j',async row=>{
    const {db}=mock({scope:row});await expect(prepareAssignedScopeRenewal(db,ids.userId,ids.assignmentId,ids.packageId)).rejects.toMatchObject({status:403});
  });
  it('will not activate merely pending/unverified payment',async()=>{
    const {db,query}=mock({paid:false});await expect(activateVerifiedAssignedScope(db,ids)).rejects.toMatchObject({code:'RENEWAL_PAYMENT_NOT_VERIFIED'});
    expect(query.mock.calls.some(([sql])=>sql.startsWith('INSERT'))).toBe(false);
  });
  it('duplicate verified payment does not extend dates or create another entitlement',async()=>{
    const {db,query}=mock({duplicate:true});expect(await activateVerifiedAssignedScope(db,ids)).toMatchObject({duplicate:true,entitlementId:'existing'});
    expect(query.mock.calls.some(([sql])=>sql.includes('AS expires_at')||sql.startsWith('INSERT'))).toBe(false);
  });
  it('extends from database scope boundary, preserves grants and audits verified payment',async()=>{
    const {db,query}=mock();expect(await activateVerifiedAssignedScope(db,ids)).toMatchObject({activated:true,duplicate:false});
    const sql=query.mock.calls.map(([s])=>s).join('\n');expect(sql).toContain('GREATEST(now()');expect(sql).toContain('pg_advisory_xact_lock');expect(sql).toContain('ASSIGNED_SCOPE_RENEWED');
    expect(sql).not.toContain('INSERT INTO public.user_module_capabilities');expect(sql).not.toContain('INSERT INTO public.entity_admin_assignments');
    expect(sql).toContain("checkout.status='successful'");expect(sql).toContain("payment.status='success'");
  });
});
