/** Real PostgreSQL replay proof using only a new private local Unix socket and synthetic rows. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync,rmSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { planTableDelta,replayTableDelta } from "./staging-snapshot-delta.mjs";
import {precisionRepairPlan,expectedRepairedTableFingerprint} from "./staging-timestamp-drift.mjs";
import {sourceSchemaEvidence}from"./staging-schema-evidence.mjs";
test("real transaction preserves values, applies once, rolls back and enforces FK failure", async()=>{
  const root=mkdtempSync("/private/tmp/mt-delta-proof-"),bin="/opt/homebrew/opt/postgresql@18/bin",data=join(root,"data");
  const run=(name,args)=>execFileSync(join(bin,name),args,{stdio:["ignore","pipe","pipe"],timeout:60000});
  let started=false,client;
  try {
    run("initdb",["--no-instructions","--auth=trust","-D",data]);
    run("pg_ctl",["-D",data,"-l",join(root,"log"),"-o",`-k ${root} -p 55439 -c listen_addresses=''`,"-w","start"]);started=true;
    client=new pg.Client({host:root,port:55439,user:process.env.USER,database:"postgres"});await client.connect();
    // Match the staging applier's deterministic timestamp serialization without rounding microseconds.
    await client.query("SET TIME ZONE 'UTC'");
    await client.query(`CREATE TABLE public.parent(id uuid PRIMARY KEY);
      CREATE TABLE public.delta_fixture(id uuid PRIMARY KEY,parent_id uuid REFERENCES public.parent(id),amount numeric(30,6),at timestamptz,note text,payload jsonb);
      INSERT INTO public.parent VALUES('00000000-0000-4000-8000-000000000001')`);
    const raw='{"id":"00000000-0000-4000-8000-000000000002","parent_id":"00000000-0000-4000-8000-000000000001","amount":9007199254740993.123456,"at":"2026-10-17T00:00:00.123456+00:00","note":null,"payload":{"preserve":"exact"}}';
    const args={table:"delta_fixture",keys:["id"],columns:["id","parent_id","amount","at","note","payload"]};
    const plan=planTableDelta({...args,baseline:[],final:[raw],target:[]});
    await client.query("BEGIN; LOCK TABLE public.delta_fixture IN SHARE ROW EXCLUSIVE MODE");
    await replayTableDelta(client,plan,args.columns,args.keys);
    const [saved]=(await client.query("SELECT amount::text,at::text,note FROM public.delta_fixture")).rows;
    assert.equal(saved.amount,"9007199254740993.123456");assert.ok(saved.at.includes(".123456"));assert.equal(saved.note,null);
    const rows=(await client.query("SELECT to_jsonb(t)::text AS row FROM public.delta_fixture t")).rows.map(r=>r.row);
    const repeated=planTableDelta({...args,baseline:[raw],final:[raw],target:rows});
    assert.equal(repeated.operations.length,0);assert.deepEqual(repeated.conflicts,[]);
    await client.query("ROLLBACK");assert.equal((await client.query("SELECT count(*)::int AS n FROM public.delta_fixture")).rows[0].n,0);
    await client.query("BEGIN");await replayTableDelta(client,plan,args.columns,args.keys);await client.query("COMMIT");
    const newer=raw.replace('"note":null','"note":"edited"');
    const update=planTableDelta({...args,baseline:[raw],final:[newer],target:rows});
    await client.query("BEGIN");await replayTableDelta(client,update,args.columns,args.keys);await client.query("ROLLBACK");
    assert.equal((await client.query("SELECT note FROM public.delta_fixture")).rows[0].note,null);
    const invalid=raw.replace('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003').replace('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000004');
    await client.query("BEGIN");
    await assert.rejects(replayTableDelta(client,planTableDelta({...args,baseline:[],final:[invalid],target:[]}),args.columns,args.keys),e=>e.code==="23503");
    await client.query("ROLLBACK");
    assert.equal((await client.query("SELECT count(*)::int AS n FROM public.delta_fixture")).rows[0].n,1);
    // Reproduce the original import path with a real pg-decoded Date, not a hand-rounded fixture.
    const date=(await client.query("SELECT at FROM public.delta_fixture")).rows[0].at;
    assert.ok(date instanceof Date);
    await client.query("UPDATE public.delta_fixture SET at=$1",[date]);
    const damaged=(await client.query("SELECT to_jsonb(t)::text AS row FROM public.delta_fixture t")).rows.map(r=>r.row);
    const drift=planTableDelta({...args,baseline:[raw],final:[raw],target:damaged});
    const repair=precisionRepairPlan({plan:drift,baseline:[raw],source:[raw],target:damaged,keys:args.keys,columns:[{column_name:"at",udt_schema:"pg_catalog",udt_name:"timestamptz"}]});
    assert.equal(repair.operations.length,1);
    await client.query("BEGIN");
    await replayTableDelta(client,{...drift,operations:repair.operations},args.columns,args.keys);
    const fixed=(await client.query("SELECT to_jsonb(t)::text AS row FROM public.delta_fixture t")).rows.map(r=>r.row);
    assert.equal(expectedRepairedTableFingerprint(fixed,[],args.keys),expectedRepairedTableFingerprint(damaged,repair.operations,args.keys));
    assert.equal(planTableDelta({...args,baseline:[raw],final:[raw],target:fixed}).conflicts.length,0);
    await client.query("ROLLBACK");
    assert.equal(expectedRepairedTableFingerprint((await client.query("SELECT to_jsonb(t)::text AS row FROM public.delta_fixture t")).rows.map(r=>r.row),[],args.keys),expectedRepairedTableFingerprint(damaged,[],args.keys));
    await client.query("UPDATE public.delta_fixture SET note='independent edit'");
    await client.query("BEGIN");
    await assert.rejects(replayTableDelta(client,{...drift,operations:repair.operations},args.columns,args.keys),/STALE_TIMESTAMP_REPAIR_PLAN/);
    await client.query("ROLLBACK");
    assert.equal((await client.query("SELECT note FROM public.delta_fixture")).rows[0].note,"independent edit");
    const catalog=await sourceSchemaEvidence(client,{publicColumns:[],schema:{}});
    assert.equal(catalog.relationships.length,1);
    assert.equal(catalog.relationships[0].missingParentRows,0);
    // A real UPDATE OF guard remains enabled while a disjoint timestamp correction succeeds.
    await client.query("BEGIN");
    await client.query(`CREATE FUNCTION public.refuse_note_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'guard remains active'; END; $$;
      CREATE TRIGGER note_guard BEFORE UPDATE OF note ON public.delta_fixture FOR EACH ROW EXECUTE FUNCTION public.refuse_note_change()`);
    const guarded=(await client.query("SELECT to_jsonb(t)::text AS row FROM public.delta_fixture t")).rows[0].row;
    await replayTableDelta(client,{table:args.table,operations:[{...repair.operations[0],beforeRaw:guarded}]},args.columns,args.keys);
    assert.equal((await client.query("SELECT tgenabled FROM pg_trigger WHERE tgname='note_guard'")).rows[0].tgenabled,"O");
    assert.equal((await client.query("SELECT note FROM public.delta_fixture")).rows[0].note,"independent edit");
    await client.query("ROLLBACK");
  } finally {
    await client?.end();
    if(started)run("pg_ctl",["-D",data,"-m","immediate","-w","stop"]);
    rmSync(root,{recursive:true,force:true});
  }
});
