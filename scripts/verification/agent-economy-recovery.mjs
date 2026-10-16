// Isolated PGlite checks: never connects to production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
let checks=0;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const alice=id(1),bob=id(2),agentA=id(11),agentB=id(12),account=id(21);
const rows=async sql=>(await db.query(sql)).rows;
const denied=async sql=>{await assert.rejects(()=>db.query(sql));checks++;};
const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
create table personal_agents(id uuid primary key,user_id uuid not null,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated,service_role;
insert into auth.users values('${alice}'),('${bob}');
insert into personal_agents values('${agentA}','${alice}',null),('${agentB}','${bob}',null);`);
const baseline=readFileSync('supabase/migrations/20260904113000_blackstar_agent_economy.sql','utf8');
await db.exec(baseline);
await db.exec(`alter table public.agent_economy_accounts add constraint agent_economy_account_identity unique(id,user_id,agent_id,currency); alter table public.agent_economy_entries add constraint agent_economy_entry_account_identity_fk foreign key(account_id,user_id,agent_id,currency) references public.agent_economy_accounts(id,user_id,agent_id,currency) on delete restrict;`);
const migration=readFileSync('supabase/migrations/20261016004500_restore_agent_economy_contracts.sql','utf8');
await db.exec(migration);
for(const table of ['agent_economy_accounts','agent_economy_entries']){
 ok((await rows(`select relrowsecurity from pg_class where oid='${table}'::regclass`))[0].relrowsecurity,'RLS enabled');
 for(const role of ['anon','authenticated']){
  for(const priv of role==='anon'?['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']:['INSERT','UPDATE','DELETE','TRUNCATE']){
   ok(!(await rows(`select has_table_privilege('${role}','${table}','${priv}') ok`))[0].ok,`${role} ${priv} denied`);
  }
 }
 ok((await rows(`select has_table_privilege('authenticated','${table}','SELECT') ok`))[0].ok,'owner select granted');
}
await denied(`insert into agent_economy_accounts(user_id,agent_id) values('${alice}','${agentB}')`);
await db.exec(`insert into agent_economy_accounts(id,user_id,agent_id,currency) values('${account}','${alice}','${agentA}','GBP');`);
await denied(`insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference) values('${bob}','${account}','${agentB}','credit',10,'GBP','bad owner')`);
await denied(`insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference) values('${alice}','${account}','${agentA}','credit',10,'USD','bad currency')`);
await denied(`insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference) values('${alice}','${account}','${agentA}','credit',0,'GBP','zero')`);
await db.exec(`insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference) values('${alice}','${account}','${agentA}','credit',10,'GBP','fixture');`);
await db.exec(`set role authenticated;set request.jwt.claim.sub='${alice}';`);
ok((await rows('select * from agent_economy_accounts')).length===1,'Alice sees own account');
ok((await rows('select * from agent_economy_entries')).length===1,'Alice sees own entry');
await denied(`insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference) values('${alice}','${account}','${agentA}','credit',100,'GBP','client')`);
await db.exec(`set request.jwt.claim.sub='${bob}';`);
ok((await rows('select * from agent_economy_accounts')).length===0,'Bob cannot see Alice account');
ok((await rows('select * from agent_economy_entries')).length===0,'Bob cannot see Alice entry');
await db.exec('reset role;');
ok((await rows(`select count(*)::int as n from pg_constraint where conname in ('agent_economy_account_owned_agent_fk','agent_economy_counterparty_owned_agent_fk')`))[0].n===2,'both ownership FKs installed');
console.log(`agent economy isolated checks passed: ${checks}`);
