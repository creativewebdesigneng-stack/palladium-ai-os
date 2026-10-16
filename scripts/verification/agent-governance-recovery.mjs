// Isolated real PostgreSQL fixtures; never writes production, credits or runtime configuration.
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();let passed=0;
const check=(v,m)=>{assert.ok(v,m);passed++;};
const rows=async q=>(await db.query(q)).rows;
const denied=async q=>{await assert.rejects(()=>db.query(q));passed++;};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a=id(1),b=id(2),org=id(11),otherOrg=id(12);
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema private;
create table auth.users(id uuid primary key);create table organisations(id uuid primary key);create table organisation_members(org_id uuid,user_id uuid,role text);
create table personal_agents(id uuid primary key,user_id uuid,org_id uuid,org_id_fk uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.organisation_members where user_id=auth.uid() and org_id=_org) $$;
create function private.is_org_admin(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.organisation_members where user_id=auth.uid() and org_id=_org and role in ('owner','admin')) $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;grant select on personal_agents to authenticated;
insert into auth.users values('${a}'),('${b}');insert into organisations values('${org}'),('${otherOrg}');
insert into organisation_members values('${org}','${a}','owner'),('${org}','${b}','member'),('${otherOrg}','${b}','owner');
insert into personal_agents values('${id(21)}','${a}','${org}','${org}'),('${id(22)}','${a}','${org}','${org}'),('${id(23)}','${b}','${otherOrg}','${otherOrg}'),('${id(24)}','${b}','${otherOrg}','${otherOrg}');`);
const file=readdirSync('supabase/migrations').find(n=>n.endsWith('_restore_agent_governance.sql'));
const migration=readFileSync('supabase/migrations/'+file,'utf8');await db.exec(migration);
const indexFile=readdirSync('supabase/migrations').find(n=>n.endsWith('_cover_agent_economy_account_identity.sql'));
await db.exec(readFileSync('supabase/migrations/'+indexFile,'utf8'));
check((await rows("select pg_get_indexdef('public.agent_economy_entries_account_identity_idx'::regclass) as definition"))[0].definition.includes('(account_id, user_id, agent_id, currency)'),'composite ledger FK index covers every identity column');
await assert.rejects(()=>db.exec(migration),/requires all six tables absent/);passed++;
const templates={
 agent_economy_accounts:n=>({agent_id:id(n===100?21:23)}),
 agent_economy_entries:n=>({account_id:id(n+1),agent_id:id(n===100?21:23),kind:'credit',amount_micros:1,currency:'GBP',reference:'Isolated fixture only'}),
 agent_simulation_runs:n=>({agent_id:id(n===100?21:23),scenario:'{}',result:'{}',status:'needs_approval',projected_cost_micros:1,risk_score:1}),
 agent_collective_deliberations:n=>({topic:'Fixture advisory',participant_agent_ids:[id(n===100?21:23),id(n===100?22:24)],proposals:'[]',consensus:'{}',status:'contested',selected_answer_key:'Fixture',confidence:0.5,agreement_ratio:0.5}),
 agent_evolution_proposals:n=>({agent_id:id(n===100?21:23),change_type:'prompt',change_summary:'Fixture proposal',baseline_metrics:'{}',candidate_metrics:'{}',decision_status:'review',decision_score:0}),
 enterprise_autonomy_policies:n=>({}),
};const tables=Object.keys(templates);
for(const t of tables){
 check((await rows(`select relrowsecurity from pg_class where oid='${t}'::regclass`))[0].relrowsecurity,'RLS');check((await rows(`select * from ${t}`)).length===0,'no backfill');
 for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])check(!(await rows(`select has_table_privilege('anon','${t}','${privilege}') ok`))[0].ok,'anonymous denied');
 check(!(await rows(`select has_table_privilege('authenticated','${t}','TRUNCATE') ok`))[0].ok,'truncate denied');
}
for(const [user,n,scope] of [[a,100,org],[b,200,otherOrg]])for(const [i,t] of tables.entries()){
 await db.exec(`reset role;set role ${t.startsWith('agent_economy_')?'service_role':'authenticated'};set request.jwt.claim.sub='${user}';`);
 const row={id:id(n+i+1),user_id:user,org_id:scope,...templates[t](n)};const keys=Object.keys(row);
 await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,j)=>'$'+(j+1)).join(',')})`,Object.values(row));passed++;
}
await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${a}';`);
for(const t of tables){check((await rows(`select * from ${t}`)).length===1,'other owner/org hidden');await denied(`delete from ${t}`);if(t!=='enterprise_autonomy_policies')await denied(`update ${t} set user_id='${b}'`);}
await denied(`insert into agent_economy_accounts(user_id,agent_id) values('${a}','${id(22)}')`);
await denied(`insert into agent_economy_entries(user_id,account_id,agent_id,kind,amount_micros,currency,reference) values('${a}','${id(101)}','${id(21)}','credit',999999,'GBP','Forged credit')`);
for(const t of ['agent_simulation_runs','agent_evolution_proposals']){
 const row={user_id:a,org_id:org,...templates[t](100),agent_id:id(23)};const keys=Object.keys(row);
 await assert.rejects(()=>db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,j)=>'$'+(j+1)).join(',')})`,Object.values(row)));passed++;
}
const insertDeliberation=async participants=>db.query(`insert into agent_collective_deliberations(user_id,org_id,topic,participant_agent_ids,proposals,consensus,status,selected_answer_key,confidence,agreement_ratio) values($1,$2,'Invalid advisory',$3,'[]','{}','contested','x',0.5,0.5)`,[a,org,participants]);
for(const participants of [[id(21),id(23)],[id(21),id(21)],[id(21)],[id(21),null]]){await assert.rejects(()=>insertDeliberation(participants));passed++;}
await denied(`insert into agent_simulation_runs(user_id,org_id,agent_id,scenario,result,status,projected_cost_micros,risk_score) values('${a}','${otherOrg}','${id(21)}','{}','{}','pass',0,0)`);
await denied(`insert into agent_evolution_proposals(user_id,org_id,agent_id,change_type,change_summary,baseline_metrics,candidate_metrics,decision_status,decision_score,applied,requires_approval) values('${a}','${org}','${id(21)}','prompt','No direct execution','{}','{}','promote',1,true,false)`);
const evolution=(await rows('select requires_approval,applied from agent_evolution_proposals'))[0];check(evolution.requires_approval&&!evolution.applied,'evolution cannot authorise itself');
const policy=(await rows('select * from enterprise_autonomy_policies'))[0];check(Number(policy.max_daily_spend_micros)===0,'zero spend default');check(policy.require_approval_for_external_writes&&policy.require_approval_for_financial_actions,'approval defaults retained');check(policy.allowed_providers.length===0&&policy.allowed_capabilities.length===0,'no provider/capability grant');
await db.exec(`set request.jwt.claim.sub='${b}';`);
check((await rows('select * from enterprise_autonomy_policies')).length===2,'member reads org guardrails');
check((await rows(`update enterprise_autonomy_policies set max_concurrent_runs=5 where org_id='${org}' returning id`)).length===0,'member cannot change org policy');
await denied(`insert into enterprise_autonomy_policies(user_id,org_id) values('${b}','${org}') on conflict(org_id) do update set user_id=excluded.user_id`);
await db.exec(`reset role;set role service_role;`);
for(const [column,value] of [['user_id',b],['agent_id',id(23)],['currency','USD']])await denied(`update agent_economy_entries set ${column}='${value}' where id='${id(102)}'`);
await denied(`delete from agent_economy_accounts where id='${id(101)}'`);
for(const t of tables)check((await rows(`select * from ${t}`)).length===2,'trusted server access retained');
await db.close();console.log(`Agent governance: ${passed} isolated Postgres authorization checks passed.`);
