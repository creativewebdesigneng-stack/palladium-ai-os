// Isolated Postgres fixtures: never prepares checkout or calls a provider.
import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const check=(v,m)=>{assert.ok(v,m);passed++;};
const denied=async q=>{await assert.rejects(()=>db.query(q));passed++;};
const rows=async q=>(await db.query(q)).rows;
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a=id(1),b=id(2),org=id(11),otherOrg=id(12);
const templates={
 shopping_tasks:n=>({agent_id:id(n===100?21:22),task_id:id(n===100?31:32),requirement:'Fixture research'}),
 shopping_results:n=>({shopping_task_id:id(n+1),product:'Fixture product',price:1}),
 purchase_requests:n=>({shopping_task_id:id(n+1),shopping_result_id:id(n+2),approval_request_id:id(n===100?41:42),product:'Fixture preparation',total:1}),
 product_watches:n=>({agent_id:id(n===100?21:22),shopping_result_id:id(n+2),product:'Fixture watch'}),
 shopping_lists:n=>({agent_id:id(n===100?21:22),name:'Fixture list'}),
 shopping_list_items:n=>({list_id:id(n+5),shopping_task_id:id(n+1),shopping_result_id:id(n+2),name:'Fixture item'}),
 spend_limits:n=>({agent_id:id(n===100?21:22),scope:'agent',per_transaction_limit:10,monthly_cap:100}),
 personal_os_profiles:n=>({primary_agent_id:id(n===100?21:22)}),
 fitness_profiles:n=>({goal:'Fixture goal'}),
 fitness_workouts:n=>({name:'Fixture workout'}),
 fitness_weight_entries:n=>({weight:70}),
 finance_transactions:n=>({org_id:org,amount:1}),
 marketing_campaigns:n=>({org_id:org,name:'Fixture draft'}),
};
const tables=Object.keys(templates),userKeys=['personal_os_profiles','fitness_profiles'];
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema private;
create table auth.users(id uuid primary key);create table organisations(id uuid primary key);
create table personal_agents(id uuid primary key,user_id uuid);create table personal_tasks(id uuid primary key,user_id uuid);
create table approval_requests(id uuid primary key,user_id uuid);create type mc_task_status as enum('pending','running','completed');
create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to authenticated,anon;grant execute on function private.is_org_member(uuid) to authenticated;
grant select on personal_agents,personal_tasks,approval_requests to authenticated;
insert into auth.users values('${a}'),('${b}');insert into organisations values('${org}'),('${otherOrg}');
insert into private.members values('${a}','${org}'),('${b}','${org}');
insert into personal_agents values('${id(21)}','${a}'),('${id(22)}','${b}');
insert into personal_tasks values('${id(31)}','${a}'),('${id(32)}','${b}');
insert into approval_requests values('${id(41)}','${a}'),('${id(42)}','${b}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_personal_workspace_and_shopping.sql'));
const migration=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(migration);
await assert.rejects(()=>db.exec(migration),/requires all thirteen tables absent/);passed++;
for(const t of tables){
 check((await rows(`select relrowsecurity from pg_class where oid='${t}'::regclass`))[0].relrowsecurity,'RLS');
 check((await rows(`select * from ${t}`)).length===0,'no backfill');
 for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('anon','${t}','${privilege}') ok`))[0].ok,'anonymous denied');
 check(!(await rows(`select has_table_privilege('authenticated','${t}','TRUNCATE') ok`))[0].ok,'truncate denied');
}
for(const [user,n] of [[a,100],[b,200]]){
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}';`);
 for(const [i,t] of tables.entries()){
  const row={...(userKeys.includes(t)?{}:{id:id(n+i+1)}),...(t==='shopping_results'?{}:{user_id:user}),...templates[t](n)};
  const keys=Object.keys(row);await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,j)=>'$'+(j+1)).join(',')})`,Object.values(row));passed++;
 }
}
await db.exec(`set request.jwt.claim.sub='${a}';`);
for(const [i,t] of tables.entries()){
 check((await rows(`select * from ${t}`)).length===1,'same-org cross-owner rows hidden');
 const key=userKeys.includes(t)?'user_id':'id',other=userKeys.includes(t)?b:id(200+i+1);
 if(t==='personal_os_profiles')await denied(`delete from ${t}`);
 else check((await rows(`delete from ${t} where ${key}='${other}' returning ${key}`)).length===0,'cross-owner deletion hidden');
 if(t==='shopping_results')await denied(`update shopping_results set shopping_task_id='${id(201)}'`);
 else await denied(`update ${t} set user_id='${b}' where user_id='${a}'`);
}
for(const [t,col,value] of [
 ['shopping_tasks','agent_id',id(22)],['shopping_tasks','task_id',id(32)],
 ['purchase_requests','shopping_task_id',id(201)],['purchase_requests','shopping_result_id',id(202)],['purchase_requests','approval_request_id',id(42)],
 ['product_watches','agent_id',id(22)],['product_watches','shopping_result_id',id(202)],
 ['shopping_lists','agent_id',id(22)],['shopping_list_items','list_id',id(205)],['shopping_list_items','shopping_task_id',id(201)],['shopping_list_items','shopping_result_id',id(202)],
 ['spend_limits','agent_id',id(22)],['personal_os_profiles','primary_agent_id',id(22)],
 ['finance_transactions','org_id',otherOrg],['marketing_campaigns','org_id',otherOrg]
])await denied(`update ${t} set ${col}='${value}'`);
await db.exec(`insert into shopping_tasks(id,user_id,requirement) values('${id(190)}','${a}','Second owned task');`);
await denied(`update purchase_requests set shopping_task_id='${id(190)}' where user_id='${a}'`);
await denied(`update shopping_list_items set shopping_task_id='${id(190)}' where user_id='${a}'`);
const profile=(await rows(`select * from personal_os_profiles where user_id='${a}'`))[0];
check(profile.max_daily_spend_micros===0n || Number(profile.max_daily_spend_micros)===0,'zero default spend');
check(profile.require_approval_for_messages && profile.require_approval_for_purchases && profile.require_approval_for_external_writes,'approvals remain required');
check(profile.allowed_capabilities.length===0,'no default capability grant');
check((await rows('select status from purchase_requests'))[0].status==='awaiting_approval','no checkout authorization backfill');
await db.exec('reset role;set role service_role;');
for(const t of tables)check((await rows(`select * from ${t}`)).length>=2,'server access retained');
await db.exec(`reset role;delete from auth.users where id='${a}';`);
for(const t of tables)check((await rows(`select * from ${t}`)).length===1,'owner deletion preserves only the other owner');
await db.close();console.log(`Personal workspace: ${passed} isolated Postgres authorization checks passed.`);
