/**
 * Enterprise Workforce: REAL, ISOLATED PostgreSQL SQL/RLS verification.
 * No Supabase network, no credentials, no agent calls, no customer records.
 *
 * Runs the two committed canonical approval migrations and audit privilege
 * migration against minimal synthetic FK/RLS fixtures in PGlite. Tool
 * executions and the pre-existing audit SELECT policy are reproduced as
 * explicit fixtures, not claimed to be current deployed DB schema proof.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
let passed = 0;
const verify = (condition, label) => { assert.ok(condition, label); passed++; };
const sql = (command, parameters = []) => db.query(command, parameters);
const rows = async (command, parameters = []) => (await sql(command, parameters)).rows;
const rejects = async (command, parameters = []) => { await assert.rejects(() => sql(command, parameters)); passed++; };
const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const owner=id(1), other=id(2), agent=id(101), run=id(201), approval=id(301);
const rejectedApproval=id(302), deniedRun=id(202);
const current = async (role, user = '') => {
  await db.exec('reset role;');
  await db.exec('set role ' + role + ';');
  await sql("select set_config('request.jwt.claim.sub',$1,false)", [user]);
};

try {
  // Minimal synthetic surrounding schema: use REAL committed approval and
  // audit-grants migrations below, rather than rewriting their policies.
  await db.exec([
    'create role anon',
    'create role authenticated',
    'create role service_role bypassrls',
    'create schema auth',
    'create schema private',
    'create table auth.users (id uuid primary key)',
    'create table organisations (id uuid primary key)',
    'create table personal_agents (id uuid primary key, user_id uuid not null, org_id uuid, org_id_fk uuid)',
    'create table personal_tasks (id uuid primary key, user_id uuid not null, org_id uuid)',
    'create table agent_tasks (id uuid primary key, user_id uuid not null, agent_id uuid not null, status text)',
    "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$",
    "create function auth.role() returns text language sql stable as $$ select current_user::text $$",
    "create function private.is_org_member(_org uuid) returns boolean language sql stable as $$ select false $$",
    "create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$",
    'alter table personal_agents enable row level security',
    'create policy owner_agents on personal_agents for select to authenticated using(user_id=auth.uid())',
    'alter table personal_tasks enable row level security',
    'create policy owner_tasks on personal_tasks for select to authenticated using(user_id=auth.uid())',
    'grant usage on schema public,auth,private to authenticated,anon,service_role',
    'grant execute on function auth.uid() to authenticated,anon',
    'grant execute on function auth.role() to authenticated,anon',
    'grant execute on function private.is_org_member(uuid) to authenticated',
    'grant select on personal_agents,personal_tasks to authenticated',
    'create table mission_audit_logs (id uuid primary key, user_id uuid not null, agent_id uuid, target_type text, target_id uuid, action text, status text, metadata jsonb not null default\'{}\'::jsonb)',
    'alter table mission_audit_logs enable row level security',
    'create policy audit_select on mission_audit_logs for select to authenticated using(user_id=auth.uid())',
    'create table tool_executions (id uuid primary key, user_id uuid not null, agent_id uuid, agent_task_id uuid, tool text, status text, input jsonb, created_at timestamptz default now())',
    'alter table tool_executions enable row level security',
    'create policy owner_tool_evidence on tool_executions for select to authenticated using(user_id=auth.uid())',
    'grant select on tool_executions to authenticated',
    'grant all on tool_executions,mission_audit_logs to service_role'
  ].join(';') + ';');
  await sql('insert into auth.users(id) values($1),($2)', [owner,other]);
  await sql('insert into personal_agents(id,user_id) values($1,$2)', [agent,owner]);
  await sql("insert into agent_tasks(id,user_id,agent_id,status) values($1,$2,$3,'completed'),($4,$2,$3,'failed')", [run,owner,agent,deniedRun]);

  await db.exec(readFileSync('supabase/migrations/20260920200500_reconcile_approval_request_foundation.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260920205500_backend_only_approval_execution_evidence.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260930235114_mission_audit_log_privilege_hardening.sql','utf8'));

  verify((await rows("select relrowsecurity from pg_class where oid='approval_requests'::regclass"))[0].relrowsecurity,
    'real approval migration enables RLS');
  verify((await rows("select has_column_privilege('authenticated','approval_requests','execution_result','UPDATE') as ok"))[0].ok===false,
    'authenticated callers cannot forge execution receipts');
  verify((await rows("select has_table_privilege('authenticated','mission_audit_logs','INSERT') as ok"))[0].ok===false,
    'authenticated callers cannot fabricate audit events');
  verify((await rows("select has_table_privilege('authenticated','mission_audit_logs','TRUNCATE') as ok"))[0].ok===false,
    'authenticated callers cannot truncate audit trail');

  await current('authenticated', owner);
  await sql("insert into approval_requests(id,user_id,agent_id,action_type,title,status,details) values($1,$2,$3,'agent_browser_task','Synthetic bounded browser test','pending',$4::jsonb)",
    [approval,owner,agent,JSON.stringify({agent_task_id:run})]);
  await sql("insert into approval_requests(id,user_id,agent_id,action_type,title,status,details) values($1,$2,$3,'agent_tool_task','Synthetic tool rejection','pending',$4::jsonb)",
    [rejectedApproval,owner,agent,JSON.stringify({agent_task_id:deniedRun,tool:'web_search'})]);
  verify((await rows('select id from approval_requests')).length===2,
    'owner sees their two synthetic approval requests');
  await rejects('update approval_requests set execution_status=\'executing\' where id=$1',[approval]);
  await rejects('update approval_requests set details=\'{}\'::jsonb where id=$1',[approval]);
  await sql("update approval_requests set status='approved',decided_by=$1,decided_at=now() where id=$2", [owner,approval]);
  await sql("update approval_requests set status='rejected',decided_by=$1,decided_at=now() where id=$2", [owner,rejectedApproval]);
  await rejects("update approval_requests set status='approved' where id=$1", [rejectedApproval]);
  await rejects('insert into mission_audit_logs(id,user_id,action) values($1,$2,\'forgery\')',[id(901),owner]);
  await rejects('update mission_audit_logs set action=\'erased\' where user_id=$1',[owner]);

  await current('service_role');
  await sql("update approval_requests set execution_status='executing' where id=$1", [approval]);
  await sql("update approval_requests set execution_status='succeeded',execution_result=$2::jsonb,executed_at=now() where id=$1",
    [approval,JSON.stringify({simulated:false,provider:'synthetic-only'})]);
  await sql("insert into tool_executions(id,user_id,agent_id,agent_task_id,tool,status,input) values($1,$2,$3,$4,'browser_task','succeeded',$5::jsonb)",
    [id(401),owner,agent,run,JSON.stringify({redacted:true})]);
  await sql("insert into tool_executions(id,user_id,agent_id,agent_task_id,tool,status,input) values($1,$2,$3,$4,'web_search','failed',$5::jsonb)",
    [id(402),owner,agent,deniedRun,JSON.stringify({redacted:true,policy_code:'domain_outside_allowlist'})]);
  await sql("insert into mission_audit_logs(id,user_id,agent_id,target_type,target_id,action,status,metadata) values($1,$2,$3,'agent_task',$4,'agent.tool_policy_denied','denied',$5::jsonb)",
    [id(501),owner,agent,deniedRun,JSON.stringify({tool:'web_search',policy_code:'domain_outside_allowlist'})]);
  await sql("insert into mission_audit_logs(id,user_id,agent_id,target_type,target_id,action,status,metadata) values($1,$2,$3,'approval_request',$4,'external_action_executed','success',$5::jsonb)",
    [id(502),owner,agent,approval,JSON.stringify({tool:'browser_task'})]);
  await rejects("update approval_requests set status='rejected' where id=$1", [approval]);
  await rejects("insert into tool_executions(id,user_id,agent_task_id,tool,status,policy_code) values($1,$2,$3,'web_search','failed','unsafe')",
    [id(403),owner,deniedRun]);
  verify((await rows("select count(*)::int as n from tool_executions where input->>'policy_code'='domain_outside_allowlist'"))[0].n===1,
    'real PostgreSQL JSONB captures bounded denial evidence without a new column');

  await current('authenticated', other);
  verify((await rows('select id from approval_requests')).length===0,
    'second authenticated user sees no owner approvals');
  verify((await rows('select id from tool_executions')).length===0,
    'second authenticated user sees no owner tool executions (synthetic RLS fixture)');
  verify((await rows('select id from mission_audit_logs')).length===0,
    'second authenticated user sees no owner audit records (synthetic RLS fixture)');
  verify((await rows("update approval_requests set status='rejected' where id=$1 returning id", [approval])).length === 0,
    "foreign authenticated owner cannot mutate an approval belonging to another user");
  await current('authenticated', owner);
  verify((await rows("select status,execution_status,execution_result from approval_requests where id=$1",[approval]))[0]?.execution_status==='succeeded',
    'owner can read trusted backend success evidence');
  verify((await rows("select status,execution_status from approval_requests where id=$1",[rejectedApproval]))[0]?.status==='rejected',
    'owner sees terminal rejection without any execution outcome');
  verify((await rows('select id from tool_executions')).length===2,'owner sees both synthetic execution receipts');
  verify((await rows('select id from mission_audit_logs')).length===2,'owner sees trusted audit receipts');
  verify((await rows("select input->>'policy_code' as code, input->>'redacted' as redacted from tool_executions where id=$1",[id(402)]))[0]?.redacted==='true',
    'denial evidence input is redacted');
  await current('anon');
  await rejects('select id from approval_requests');
  await rejects('select id from mission_audit_logs');

  process.stdout.write('Enterprise Workforce ISOLATED PostgreSQL controls PASS: '+passed+' real SQL checks, synthetic fixtures only, zero Supabase/agent/browser network.\n');
} finally { await db.close(); }
