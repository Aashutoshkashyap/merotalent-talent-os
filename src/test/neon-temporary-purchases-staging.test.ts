import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getPool } from "@/lib/server/db";
import { getNeonDatabaseConfig, NEON_MIGRATION_STAGING_BRANCH_ID } from "@/lib/neon/neon-config";
import { configureTemporaryAccessOffers } from "@/lib/server/neon-test-access-offers";
import { NeonModuleAccess, prepareNeonModuleAccessCheckout } from "@/lib/server/neon-module-access";
import { NeonRoleWorkspaces } from "@/lib/server/neon-role-workspaces";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import { NeonCheckoutService } from "@/lib/server/neon-checkout";
import { expireNeonPurchaseHolds } from "@/lib/server/neon-purchase-expiry";
import { NeonMentorsRepository } from "@/lib/server/neon-mentors";
import type { NeonActor } from "@/lib/server/neon-authorization";
import type { EsewaV2PaymentProvider } from "@/lib/server/payment-provider";

describe("isolated temporary purchases, governance and group inventory",()=>{
  it("preserves plans, charges per module, requires approval, issues one pass per group member and releases expired holds",async()=>{
    const parsed=dotenv.config({path:".migration.env",quiet:true}).parsed ?? {};
    Object.assign(process.env,parsed,{MEROTALENT_BACKEND_MODE:"neon-staging",NEON_STAGING_BRANCH_ID:NEON_MIGRATION_STAGING_BRANCH_ID});
    getNeonDatabaseConfig();
    const db=await getPool().connect();
    try {
      await db.query("BEGIN");await db.query("SET LOCAL statement_timeout='15s'");
      const identity=(await db.query(`SELECT a.legacy_user_id,l.neon_auth_user_id FROM public.neon_identity_links l
        JOIN public.neon_application_accounts a ON a.id=l.application_account_id AND a.status='active'
        JOIN public.profiles p ON p.user_id=a.legacy_user_id AND p.account_status='active' AND p.deleted_at IS NULL
        WHERE l.status='verified' LIMIT 1`)).rows[0];
      expect(identity).toBeDefined();
      const actor:NeonActor={userId:identity.legacy_user_id,neonAuthUserId:identity.neon_auth_user_id,platformAdmin:false,roles:[],permissions:[]};
      const admin={...actor,platformAdmin:true,roles:["super_admin"]};
      await db.query(`INSERT INTO public.user_roles(user_id,role) SELECT $1::uuid,'super_admin'
        WHERE NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=$1::uuid AND role='super_admin')`,[actor.userId]);
      const run=<T>(operation:(client:import("pg").PoolClient)=>Promise<T>)=>operation(db);
      const historical=(await db.query(`SELECT id,code,price,duration_days FROM public.packages WHERE code NOT LIKE 'temporary-24h-%' ORDER BY id`)).rows;
      await configureTemporaryAccessOffers(admin,run);
      expect(await configureTemporaryAccessOffers(admin,run)).toMatchObject({created:0,preservedExisting:true});
      expect((await db.query(`SELECT id,code,price,duration_days FROM public.packages WHERE code NOT LIKE 'temporary-24h-%' ORDER BY id`)).rows).toEqual(historical);
      const plans=(await db.query(`SELECT * FROM public.packages WHERE code LIKE 'temporary-24h-%'`)).rows;
      expect(plans).toHaveLength(15);
      for(const plan of plans){expect(Number(plan.price)).toBe(plan.module_scope.length*10);expect(plan.duration_days).toBe(1);}
      const requestId=randomUUID(), bundle=plans.find(plan=>plan.code==='temporary-24h-events-jobs');
      await db.query(`INSERT INTO public.sub_admin_requests(id,user_id,user_name,user_email,requested_modules,reason,organization,status,package_id)
        SELECT $1::uuid,user_id,full_name,email,ARRAY['events','jobs'],'Isolated acceptance request','Isolated test organization','pending',$3::uuid
        FROM public.profiles WHERE user_id=$2::uuid`,[requestId,actor.userId,bundle.id]);
      expect(await prepareNeonModuleAccessCheckout(actor,requestId,bundle.id,db)).toMatchObject({amount:20});
      const modules=new NeonModuleAccess(run);
      await expect(modules.decide(admin,requestId,true)).rejects.toMatchObject({code:'PAYMENT_NOT_VERIFIED'});
      // Application settlement fixture ONLY: this is not a real provider transaction.
      let providerState='successful';
      const provider={createCheckout:async()=>({status:'pending',checkoutUrl:'https://sandbox.example.invalid',checkoutFields:{fixture:'not-a-real-payment'}}),
        lookupStatus:async({reference}:{reference:string})=>({status:providerState,transactionId:`fixture-${reference}`})} as unknown as EsewaV2PaymentProvider;
      const checkout=new NeonCheckoutService(provider);
      const order=await checkout.initiate(actor,'module_access_request',requestId,'http://localhost:3210',db,bundle.id);
      const paymentRef=order.session.provider_reference;
      await checkout.verifyReturn({reference:paymentRef},db);
      expect((await db.query(`SELECT status,payment_status FROM public.sub_admin_requests WHERE id=$1::uuid`,[requestId])).rows[0]).toMatchObject({status:'pending',payment_status:'success'});
      expect((await db.query(`SELECT id FROM public.module_entitlements WHERE payment_id=$1::uuid`,[paymentRef])).rowCount).toBe(0);
      const count=(await db.query(`SELECT count(*)::int AS n FROM public.notifications WHERE entity_id=$1::uuid`,[paymentRef])).rows[0].n;
      expect((await checkout.verifyReturn({reference:paymentRef},db)).duplicate).toBe(true);
      expect((await db.query(`SELECT count(*)::int AS n FROM public.notifications WHERE entity_id=$1::uuid`,[paymentRef])).rows[0].n).toBe(count);
      await modules.decide(admin,requestId,true);
      const eventId=randomUUID();
      await db.query(`INSERT INTO public.events(id,title,organizer_user_id,status,approval_status,is_active,event_type,start_date,end_date,capacity)
        VALUES($1::uuid,'Isolated group inventory',$2::uuid,'published','approved',true,'paid',now()+interval '2 days',now()+interval '3 days',3)`,[eventId,actor.userId]);
      await modules.assign(admin,requestId,'events',eventId);
      expect((await db.query(`SELECT extract(epoch FROM (e.expires_at-p.paid_at)) AS seconds FROM public.module_entitlements e
        JOIN public.payments p ON p.id=e.payment_id WHERE e.payment_id=$1::uuid`,[paymentRef])).rows[0].seconds).toBe('86400.000000');
      const workspace=new NeonRoleWorkspaces(run);
      const tier=await workspace.ticketConfiguration(admin,eventId,{name:'Group Booking',ticket_kind:'group',price:10,currency:'NPR',total_quantity:1,
        min_team_size:2,max_team_size:3,min_per_order:1,max_per_order:1,is_active:true,eligibility_rules:{benefits:['Silver access']}}) as {id:string};
      const publicEvents=new NeonEventsRepository({query:async<T extends import('pg').QueryResultRow>(sql:string,params:readonly unknown[]=[])=>
        (await db.query<T>(sql,[...params])).rows});
      expect((await publicEvents.listPublicEvents({search:'Isolated group inventory'})).find(row=>row.id===eventId))
        .toMatchObject({ticket_pricing:{price:10,currency:'NPR'}});
      const events=new NeonEventsRepository();
      const registration=await events.registerForEvent(actor,{eventId,ticketTypeId:tier.id,ticketQuantity:1,attendeeCount:2,
        teamName:'Isolated group',participants:[{fullName:'Member One'},{fullName:'Member Two'}]},db);
      expect(Number(registration.total_amount)).toBe(10);
      expect((await events.registerForEvent(actor,{eventId,ticketTypeId:tier.id,ticketQuantity:1,attendeeCount:2,
        teamName:'Isolated group',participants:[{fullName:'Member One'},{fullName:'Member Two'}]},db)).id).toBe(registration.id);
      expect((await db.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`,[registration.id])).rowCount).toBe(0);
      const ticketCheckout=await checkout.initiate(actor,'event_registration',registration.id,'http://localhost:3210',db);
      await checkout.verifyReturn({reference:ticketCheckout.session.provider_reference},db);
      expect((await db.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`,[registration.id])).rowCount).toBe(2);
      expect((await checkout.verifyReturn({reference:ticketCheckout.session.provider_reference},db)).duplicate).toBe(true);
      expect((await db.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`,[registration.id])).rowCount).toBe(2);
      // Attendee capacity counts members, not groups; a confirmed user's duplicate is rejected first.
      const extra=await workspace.ticketConfiguration(admin,eventId,{name:'Regular',ticket_kind:'individual',price:10,currency:'NPR',total_quantity:5,
        min_team_size:1,max_team_size:1,min_per_order:1,max_per_order:10,is_active:true}) as {id:string};
      expect((await db.query(`SELECT sum(GREATEST(attendee_count,ticket_quantity))::int AS attendees FROM public.event_registrations
        WHERE event_id=$1::uuid AND status='confirmed'`,[eventId])).rows[0].attendees).toBe(2);
      await expect(events.registerForEvent(actor,{eventId,ticketTypeId:extra.id,ticketQuantity:2},db)).rejects.toMatchObject({code:'ALREADY_REGISTERED'});
      // Disposable second event: expiry releases a reservation without creating paid tickets.
      const expiryEvent=randomUUID();
      await db.query(`INSERT INTO public.events(id,title,organizer_user_id,status,approval_status,is_active,event_type,ticket_price,start_date,end_date,capacity)
        VALUES($1::uuid,'Isolated expiry',$2::uuid,'published','approved',true,'paid',10,now()+interval '2 days',now()+interval '3 days',1)`,[expiryEvent,actor.userId]);
      const held=await events.registerForEvent(actor,{eventId:expiryEvent},db);
      const pending=await checkout.initiate(actor,'event_registration',held.id,'http://localhost:3210',db);
      await db.query(`UPDATE public.payment_checkout_sessions SET expires_at=now()-interval '1 second' WHERE id=$1::uuid`,[pending.session.id]);
      // The existing database trigger may release the registration during the checkout update.
      expect(await expireNeonPurchaseHolds(db,expiryEvent)).toMatchObject({checkouts:1});
      expect((await db.query(`SELECT status,payment_status FROM public.event_registrations WHERE id=$1::uuid`,[held.id])).rows[0]).toEqual({status:'cancelled',payment_status:'failed'});
      expect((await db.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`,[held.id])).rowCount).toBe(0);
      const mentorOwner=(await db.query(`SELECT p.user_id FROM public.profiles p WHERE p.user_id<>$1::uuid
        AND p.deleted_at IS NULL AND p.account_status='active'
        AND NOT EXISTS(SELECT 1 FROM public.mentors m WHERE m.user_id=p.user_id) LIMIT 1`,[actor.userId])).rows[0];
      expect(mentorOwner).toBeDefined();
      await db.query(`UPDATE public.profiles SET full_name='Isolated verified buyer',phone='9800000000' WHERE user_id=$1::uuid`,[actor.userId]);
      const mentorId=randomUUID(),serviceId=randomUUID();
      await db.query(`INSERT INTO public.mentors(id,user_id,headline,is_available,approval_status,commission_rate)
        VALUES($1::uuid,$2::uuid,'Isolated group mentor',true,'approved',15)`,[mentorId,mentorOwner.user_id]);
      await db.query(`INSERT INTO public.mentor_services(id,mentor_id,title,session_type,duration_minutes,capacity,price,currency,is_active)
        VALUES($1::uuid,$2::uuid,'Isolated NPR 10 group session','group',60,2,10,'NPR',true)`,[serviceId,mentorId]);
      const mentors=new NeonMentorsRepository(),start=new Date(Date.now()+2*86400000).toISOString(),end=new Date(Date.parse(start)+3600000).toISOString();
      const booking=await mentors.bookMentorSession(actor,{mentorId,mentorServiceId:serviceId,scheduledStart:start,scheduledEnd:end,topic:'Isolated settlement'},db);
      const mentorCheckout=await checkout.initiate(actor,'mentor_booking',booking.id,'http://localhost:3210',db);
      await checkout.verifyReturn({reference:mentorCheckout.session.provider_reference},db);
      expect((await db.query(`SELECT commission_amount::float AS commission_amount,payout_amount::float AS payout_amount,payout_status FROM public.payments WHERE id=$1::uuid`,
        [mentorCheckout.session.provider_reference])).rows[0]).toEqual({commission_amount:1.5,payout_amount:8.5,payout_status:'pending'});
      expect((await checkout.verifyReturn({reference:mentorCheckout.session.provider_reference},db)).duplicate).toBe(true);
      expect((await db.query(`SELECT id FROM public.payments WHERE parent_payment_id=$1::uuid`,[mentorCheckout.session.provider_reference])).rowCount).toBe(0);
      providerState='pending';
    }finally{await db.query('ROLLBACK').catch(()=>{});db.release();await getPool().end();}
  },120000);
});
