import {describe,it,expect} from 'vitest';
import dotenv from 'dotenv';
import {randomUUID} from 'node:crypto';
import {getPool} from '@/lib/server/db';
import {getNeonDatabaseConfig,NEON_MIGRATION_STAGING_BRANCH_ID} from '@/lib/neon/neon-config';
import {NeonCheckoutService} from '@/lib/server/neon-checkout';
import {prepareAssignedScopeRenewal} from '@/lib/server/neon-assigned-scope-renewal';
import type {NeonActor} from '@/lib/server/neon-authorization';
import type {EsewaV2PaymentProvider} from '@/lib/server/payment-provider';

describe('actual isolated assigned-scope renewal',()=>{
  it('renews an assigned college without a claim request, preserves scope, adds durations and rejects revoked/cross-user access',async()=>{
    const parsed=dotenv.config({path:'.migration.env',quiet:true}).parsed??{};
    Object.assign(process.env,parsed,{MEROTALENT_BACKEND_MODE:'neon-staging',NEON_STAGING_BRANCH_ID:NEON_MIGRATION_STAGING_BRANCH_ID});getNeonDatabaseConfig();
    const db=await getPool().connect();
    try{
      await db.query('BEGIN');
      const identity=(await db.query<{user_id:string;neon_auth_user_id:string}>(`SELECT a.legacy_user_id AS user_id,l.neon_auth_user_id
        FROM public.neon_identity_links l JOIN public.neon_application_accounts a ON a.id=l.application_account_id
        JOIN public.profiles p ON p.user_id=a.legacy_user_id WHERE l.status='verified' AND a.status='active'
          AND p.account_status='active' AND p.deleted_at IS NULL LIMIT 1`)).rows[0];expect(identity).toBeTruthy();
      const actor:NeonActor={userId:identity.user_id,neonAuthUserId:identity.neon_auth_user_id,roles:[],permissions:[],platformAdmin:false};
      const college=(await db.query<{id:string}>(`SELECT id FROM public.institutes WHERE deleted_at IS NULL AND status='approved' LIMIT 1`)).rows[0];
      const capability=(await db.query<{id:string}>(`SELECT id FROM public.module_capabilities WHERE module_key='college' AND is_active LIMIT 1`)).rows[0];
      const umc=(await db.query<{id:string}>(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
        VALUES($1::uuid,$2::uuid,'active') ON CONFLICT(user_id,capability_id) DO UPDATE SET status='active',expires_at=NULL RETURNING id`,[actor.userId,capability.id])).rows[0];
      const assignment=(await db.query<{id:string}>(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status)
        VALUES($1::uuid,$2::uuid,'college',$3::uuid,'active') ON CONFLICT(user_capability_id,entity_type,entity_id)
        DO UPDATE SET status='active' RETURNING id`,[actor.userId,umc.id,college.id])).rows[0];
      const packageId=randomUUID();await db.query(`INSERT INTO public.packages(id,code,name,price,currency,billing_interval,duration_days,
        package_kind,module_scope,is_active,is_publicly_selectable,features) VALUES($1::uuid,$1::text,'Isolated renewal',125,'NPR','month',7,
        'paid',ARRAY['college'],true,true,'{"profile_editing":true}'::jsonb)`,[packageId]);
      // Isolate pre-existing access, without committing changes to this actual owner.
      await db.query(`UPDATE public.module_entitlements SET status='expired' WHERE user_id=$1::uuid AND entity_type='college' AND entity_id=$2::uuid`,[actor.userId,college.id]);
      await db.query(`UPDATE public.subscriptions SET status='expired' WHERE user_id=$1::uuid AND entity_type='college' AND entity_id=$2::uuid`,[actor.userId,college.id]);
      await db.query(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,package_id,source,status,start_at,expires_at,features)
        VALUES($1::uuid,'college','college',$2::uuid,$3::uuid,'ESEWA_PURCHASE','active',now(),now()+interval '2 days','{}'::jsonb)`,[actor.userId,college.id,packageId]);
      const before=(await db.query<{end:Date}>('SELECT now()+interval \'2 days\' AS end')).rows[0].end;
      let providerStatus='pending';
      const provider={createCheckout:async()=>({status:'pending',checkoutUrl:'https://sandbox.example.invalid',checkoutFields:{fixture:'mock-only'}}),lookupStatus:async({reference}:{reference:string})=>({status:providerStatus,transactionId:`mock-${reference}`})} as unknown as EsewaV2PaymentProvider;
      const service=new NeonCheckoutService(provider);
      const first=await service.initiate(actor,'assigned_scope',assignment.id,'http://localhost:3210',db,packageId,true);
      const ref=first.session.provider_reference;
      expect((await service.verifyReturn({reference:ref},db)).status).toBe('pending');
      expect((await db.query('SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid',[ref])).rowCount).toBe(0);
      providerStatus='successful';expect((await service.verifyReturn({reference:ref},db)).status).toBe('successful');
      const end1=(await db.query<{expires_at:Date}>('SELECT expires_at FROM public.module_entitlements WHERE payment_id=$1::uuid',[ref])).rows[0].expires_at;
      expect(new Date(end1).getTime()-new Date(before).getTime()).toBe(7*86400000);
      expect((await service.verifyReturn({reference:ref},db)).duplicate).toBe(true);
      const second=await service.initiate(actor,'assigned_scope',assignment.id,'http://localhost:3210',db,packageId,true);
      expect(second.session.provider_reference).not.toBe(ref);
      await service.verifyReturn({reference:second.session.provider_reference},db);
      const end2=(await db.query<{expires_at:Date}>('SELECT expires_at FROM public.module_entitlements WHERE payment_id=$1::uuid',[second.session.provider_reference])).rows[0].expires_at;
      expect(new Date(end2).getTime()-new Date(end1).getTime()).toBe(7*86400000);
      await expect(service.initiate({...actor,userId:randomUUID()},'assigned_scope',assignment.id,'http://localhost:3210',db,packageId,true)).rejects.toMatchObject({code:'IDENTITY_NOT_LINKED'});
      await expect(prepareAssignedScopeRenewal(db,randomUUID(),assignment.id,packageId)).rejects.toMatchObject({code:'RENEWAL_SCOPE_REQUIRED'});
      await db.query(`UPDATE public.module_entitlements SET status='expired' WHERE user_id=$1::uuid AND entity_type='college' AND entity_id=$2::uuid`,[actor.userId,college.id]);
      await db.query(`UPDATE public.subscriptions SET status='expired' WHERE user_id=$1::uuid AND entity_type='college' AND entity_id=$2::uuid`,[actor.userId,college.id]);
      const expiredRenewal=await service.initiate(actor,'assigned_scope',assignment.id,'http://localhost:3210',db,packageId,true);
      await service.verifyReturn({reference:expiredRenewal.session.provider_reference},db);
      // pg's Date decoder truncates PostgreSQL microseconds to milliseconds.
      expect((await db.query(`SELECT abs(extract(epoch FROM expires_at)-extract(epoch FROM now()+interval '7 days'))*1000<1 AS restored FROM public.module_entitlements WHERE payment_id=$1::uuid`,[expiredRenewal.session.provider_reference])).rows[0].restored).toBe(true);
      await db.query(`UPDATE public.entity_admin_assignments SET status='revoked' WHERE id=$1::uuid`,[assignment.id]);
      await expect(service.initiate(actor,'assigned_scope',assignment.id,'http://localhost:3210',db,packageId,true)).rejects.toMatchObject({code:'RENEWAL_SCOPE_REQUIRED'});
      expect((await db.query(`SELECT count(*)::int AS n FROM public.module_entitlements WHERE payment_id=ANY($1::uuid[])`,[[ref,second.session.provider_reference,expiredRenewal.session.provider_reference]])).rows[0].n).toBe(3);
    }finally{await db.query('ROLLBACK').catch(()=>{});db.release();await getPool().end();}
  },120000);
});
