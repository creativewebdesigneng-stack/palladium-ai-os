// Run with npm run test:trust-fabric. Uses a pinned development-only Postgres engine.
// All identities, users and grants here are isolated in-memory fixtures.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const migration=readdirSync('supabase/migrations').find(name=>name.endsWith('_restore_trust_fabric_current_authorization.sql'));
const ids={a:'00000000-0000-4000-8000-000000000001',b:'00000000-0000-4000-8000-000000000002',o1:'00000000-0000-4000-8000-000000000011',o2:'00000000-0000-4000-8000-000000000012',o3:'00000000-0000-4000-8000-000000000013'};
const agent=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let passed=0;
const check=(value,message)=>{assert.ok(value,message);passed++;};
const sql=async query=>(await db.query(query)).rows;
const denied=async(query,message)=>{await assert.rejects(()=>db.query(query));passed++;};
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key);
create table public.organisations(id uuid primary key);
create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
create table public.personal_agents(id uuid primary key,user_id uuid references auth.users,org_id uuid references public.organisations,org_id_fk uuid references public.organisations,name text,purpose text,status text);
alter table public.personal_agents enable row level security;
create policy fixture_agents on public.personal_agents for select to authenticated using(user_id=auth.uid());
grant usage on schema auth,private,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant select on public.personal_agents to authenticated;
insert into auth.users values('${ids.a}'),('${ids.b}');
insert into public.organisations values('${ids.o1}'),('${ids.o2}'),('${ids.o3}');
insert into private.members values('${ids.a}','${ids.o1}'),('${ids.a}','${ids.o2}'),('${ids.b}','${ids.o1}'),('${ids.b}','${ids.o3}');
insert into public.personal_agents values
('${agent(101)}','${ids.a}','${ids.o1}',null,'A1','Fixture','active'),
('${agent(102)}','${ids.a}','${ids.o1}',null,'A2','Fixture','active'),
('${agent(103)}','${ids.a}','${ids.o2}',null,'A3','Fixture','archived'),
('${agent(104)}','${ids.b}','${ids.o3}',null,'B4','Fixture','active'),
('${agent(105)}','${ids.b}','${ids.o1}',null,'B5','Fixture','active');
`);
await db.exec(readFileSync(`supabase/migrations/${migration}`,'utf8'));
await assert.rejects(()=>db.exec(readFileSync(`supabase/migrations/${migration}`,'utf8')));passed++;
check((await sql("select has_function_privilege('anon','public.resolve_agent_delegation(uuid,uuid,text)','EXECUTE') ok"))[0].ok===false,'anonymous resolver execution denied');
check(Number((await sql('select count(*) n from agent_identities'))[0].n)===5,'backfills existing identity metadata');
check(Number((await sql('select count(*) n from agent_passports'))[0].n)===5,'backfills passports');
check((await sql(`select status from agent_identities where agent_id='${agent(103)}'`))[0].status==='revoked','archived identity remains revoked');
check(Number((await sql("select count(*) n from agent_passports where capabilities <> '[]' or provider_scopes <> '[]' or tool_scopes <> '[]'"))[0].n)===0,'no capability grants backfilled');
check(Number((await sql('select count(*) n from agent_delegation_grants'))[0].n)===0,'no delegations backfilled');
check((await sql("select prosecdef from pg_proc where proname='resolve_agent_delegation'"))[0].prosecdef===false,'resolver uses invoker privileges');
for(const table of ['agent_identities','agent_passports','agent_delegation_grants','agent_a2a_messages']){
 check((await sql(`select relrowsecurity from pg_class where oid='public.${table}'::regclass`))[0].relrowsecurity,'RLS enabled');
 check((await sql(`select has_table_privilege('anon','public.${table}','SELECT') ok`))[0].ok===false,'anonymous read denied');
 check((await sql(`select has_table_privilege('anon','public.${table}','INSERT') ok`))[0].ok===false,'anonymous write denied');
 check((await sql(`select has_table_privilege('authenticated','public.${table}','TRUNCATE') ok`))[0].ok===false,'truncate denied');
}
await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${ids.a}',false);`);
check(Number((await sql('select count(*) n from agent_identities'))[0].n)===3,'only owner metadata visible even with shared organisation membership');
check(Number((await sql('select count(*) n from agent_passports'))[0].n)===3,'passport visibility follows owner identity RLS');
check((await sql(`update agent_identities set issuer='tampered' where agent_id='${agent(105)}' returning id`)).length===0,'organisation membership does not grant writes');
await denied(`update agent_passports set identity_id=(select id from agent_identities where agent_id='${agent(105)}') where identity_id=(select id from agent_identities where agent_id='${agent(101)}')`,'passport ownership reassignment denied');
await denied(`update agent_identities set user_id='${ids.b}' where agent_id='${agent(101)}'`,'owner reassignment denied');
await denied(`update agent_identities set trust_tier='privileged' where agent_id='${agent(101)}'`,'self assertion of privilege denied');
await denied(`update agent_identities set org_id='${ids.o2}' where agent_id='${agent(101)}'`,'identity organisation mismatch denied');
const grantValues=(recipient,org)=>`('${ids.a}','${org}','${agent(101)}','${recipient}','["search"]',true,false,'${ids.a}')`;
const grantInsert='insert into agent_delegation_grants(user_id,org_id,grantor_agent_id,grantee_agent_id,scopes,requires_approval,allow_external_actions,created_by) values';
await denied(grantInsert+grantValues(agent(104),ids.o1),'cross-owner delegation denied');
await denied(grantInsert+grantValues(agent(103),ids.o1),'cross-organisation delegation denied');
const grant=(await sql(grantInsert+grantValues(agent(102),ids.o1)+' returning id'))[0].id;
check((await sql(`select * from resolve_agent_delegation('${agent(101)}','${agent(102)}','search')`)).length===1,'owner resolver succeeds');
await denied(`update agent_delegation_grants set user_id='${ids.b}' where id='${grant}'`,'grant reassignment denied');
await sql(`update agent_delegation_grants set expires_at=now()-interval '1 day' where id='${grant}'`);
check((await sql(`select * from resolve_agent_delegation('${agent(101)}','${agent(102)}','search')`)).length===0,'resolver rejects expired grant');
const msg=(recipient,org)=>`insert into agent_a2a_messages(user_id,org_id,sender_agent_id,recipient_agent_id,scope) values('${ids.a}','${org}','${agent(101)}','${recipient}','search')`;
await denied(msg(agent(104),ids.o1),'cross-owner message denied');
await denied(msg(agent(103),ids.o1),'cross-organisation message denied');
const message=(await sql(msg(agent(102),ids.o1)+' returning id'))[0].id;
check(Boolean(message),'same-owner same-organisation envelope allowed');
await denied(`update agent_a2a_messages set org_id='${ids.o2}' where id='${message}'`,'message organisation reassignment denied');
await denied(`delete from agent_a2a_messages where id='${message}'`,'message permanent deletion not granted');
await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${ids.b}',false);`);
check((await sql(`select * from resolve_agent_delegation('${agent(101)}','${agent(102)}','search')`)).length===0,'resolver does not return another owner grant');
check((await sql('select * from agent_a2a_messages')).length===0,'another owner messages invisible');
await db.close();
console.log(`Trust Fabric recovery: ${passed} isolated Postgres checks passed.`);
