/** Fixed forward migration, pinned to migration-staging. Never accepts a production URL. */
import {createHash} from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import {requireNeonMigrationStaging} from './require-neon-migration-staging.mjs';
import {eventActivitySql} from './event-activities-migration.mjs';
const env=dotenv.config({path:'.migration.env',quiet:true}).parsed??{};
requireNeonMigrationStaging(env.NEON_STAGING_DATABASE_URL);
const sql=await eventActivitySql();
const client=new pg.Client({connectionString:env.NEON_STAGING_DATABASE_URL,connectionTimeoutMillis:10000});
try{await client.connect();await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='30s'");
  await client.query(sql);await client.query(process.argv.includes('--apply-staging')?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({result:'PASS',target:'migration-staging',applied:process.argv.includes('--apply-staging'),sha256:createHash('sha256').update(sql).digest('hex'),productionWrites:0}));
}catch(error){await client.query('ROLLBACK').catch(()=>{});console.error(JSON.stringify({result:'FAIL',code:error.code??'MIGRATION_FAILED'}));process.exitCode=1;
}finally{await client.end().catch(()=>{})}
