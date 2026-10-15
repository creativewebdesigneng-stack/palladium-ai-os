// Isolated Postgres fixtures only. Never connects to production.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed++; };
const denied = async query => { await assert.rejects(() => db.query(query)); passed++; };
const rows = async query => (await db.query(query)).rows;
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const org = '00000000-0000-4000-8000-000000000011';
const otherOrg = '00000000-0000-4000-8000-000000000012';
const migration = suffix => readFileSync('supabase/migrations/' + readdirSync('supabase/migrations').find(n => n.endsWith(suffix)), 'utf8');
const recovery = migration('_restore_connector_dashboard_settings.sql');
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema private;
create table auth.users(id uuid primary key);
create table organisations(id uuid primary key);
create table private.members(user_id uuid,org_id uuid);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function private.is_org_member(_org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from private.members where user_id=auth.uid() and org_id=_org) $$;
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
grant usage on schema auth,private,public to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
insert into auth.users values('${a}'),('${b}');
insert into organisations values('${org}'),('${otherOrg}');
insert into private.members values('${a}','${org}'),('${b}','${org}');
create table external_mcp_servers(user_id uuid,slug text,unique(user_id,slug));
create unique index external_mcp_servers_user_slug_uidx on external_mcp_servers(user_id,slug);
alter table external_mcp_servers enable row level security;
grant select,insert,update,delete on external_mcp_servers to authenticated;
create policy external_mcp_servers_select_own on external_mcp_servers for select to authenticated using(user_id=auth.uid());
create policy external_mcp_servers_insert_own on external_mcp_servers for insert to authenticated with check(user_id=auth.uid());
create policy external_mcp_servers_update_own on external_mcp_servers for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy external_mcp_servers_delete_own on external_mcp_servers for delete to authenticated using(user_id=auth.uid());
create table agent_identities(org_id uuid);
create table agent_delegation_grants(created_by uuid,org_id uuid,user_id uuid);
`);
await db.exec(recovery);
await assert.rejects(() => db.exec(recovery), /requires all four tables to be absent/); passed++;
await db.exec(migration('_tune_connector_and_trust_indexes.sql'));
for (const table of ['integrations','integration_credentials','dashboard_widgets','platform_settings']) {
  check((await rows(`select relrowsecurity from pg_class where oid='${table}'::regclass`))[0].relrowsecurity, `${table} RLS`);
  for (const role of ['anon','authenticated']) {
    check(!(await rows(`select has_table_privilege('${role}','${table}','TRUNCATE') ok`))[0].ok, 'no truncate');
    if (role === 'anon' || ['integration_credentials','platform_settings'].includes(table)) {
      for (const privilege of ['SELECT','INSERT','UPDATE','DELETE']) {
        check(!(await rows(`select has_table_privilege('${role}','${table}','${privilege}') ok`))[0].ok, 'private table grants');
      }
    }
  }
}
check(Number((await rows('select count(*) n from integrations'))[0].n) === 0, 'no fabricated connections');
check(Number((await rows('select count(*) n from integration_credentials'))[0].n) === 0, 'no fabricated credentials');
check((await rows("select (value->>'enabled')::boolean enabled from platform_settings where key='announcement'"))[0].enabled === false, 'announcement disabled');
await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
await db.exec(`insert into integrations(user_id,org_id,provider) values('${a}','${org}','github');
insert into dashboard_widgets(user_id,title,kind) values('${a}','Private widget','note');`);
check((await rows('select * from integrations')).length === 1, 'owner reads own');
await denied(`insert into integrations(user_id,provider) values('${b}','github')`);
await denied(`insert into integrations(user_id,org_id,provider) values('${a}','${otherOrg}','shopify')`);
await denied(`update integrations set user_id='${b}'`);
await denied(`update integrations set org_id='${otherOrg}'`);
await denied(`update dashboard_widgets set user_id='${b}'`);
await denied('select * from integration_credentials');
await denied('select * from platform_settings');
await db.exec(`set request.jwt.claim.sub='${b}';`);
check((await rows('select * from integrations')).length === 0, 'same org does not expose connection config');
check((await rows('select * from dashboard_widgets')).length === 0, 'widgets isolated');
check((await rows("update integrations set name='hijack' returning id")).length === 0, 'cross owner update hidden');
check((await rows('delete from integrations returning id')).length === 0, 'cross owner deletion hidden');
await db.exec(`insert into external_mcp_servers values('${b}','owned');`);
await denied(`insert into external_mcp_servers values('${a}','other')`);
await denied(`update external_mcp_servers set user_id='${a}'`);
await db.exec(`set request.jwt.claim.sub='${a}';`);
check((await rows('select * from external_mcp_servers')).length === 0, 'optimized MCP policy retains isolation');
await db.exec(`reset role;`);
check((await rows("select to_regclass('external_mcp_servers_user_slug_uidx') value"))[0].value === null, 'redundant index removed');
check((await rows("select to_regclass('external_mcp_servers_user_id_slug_key') value"))[0].value !== null, 'uniqueness index preserved');
await denied(`insert into external_mcp_servers values('${b}','owned')`);
check(Number((await rows("select count(*) n from pg_indexes where indexname in ('agent_delegation_grants_created_by_idx','agent_delegation_grants_org_idx','agent_delegation_grants_owner_idx','agent_identities_org_idx')"))[0].n) === 4, 'four covering indexes');
await db.exec(`set role anon;`);
await denied('select * from integrations');
await denied('select * from dashboard_widgets');
await db.exec(`reset role;set role service_role;`);
check((await rows('select * from platform_settings')).length === 1, 'server settings reachable');
check((await rows('select * from integrations')).length === 1, 'server connection access retained');
await db.close();
console.log(`Connector recovery: ${passed} isolated Postgres authorization checks passed.`);
