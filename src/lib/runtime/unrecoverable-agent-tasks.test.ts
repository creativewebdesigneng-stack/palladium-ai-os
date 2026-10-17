import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const directory = new URL('../../../supabase/migrations/', import.meta.url);
const filename = readdirSync(directory).find(name => name.endsWith('_close_unrecoverable_agent_tasks.sql'));
if (!filename) throw new Error('Recorded recovery migration is missing.');
const migration = readFileSync(new URL(filename, directory), 'utf8');
const correction = readFileSync(new URL('20261017182912_fix_unrecoverable_agent_task_status_type.sql', directory), 'utf8');
const db = new PGlite();
const uid = '00000000-0000-4000-8000-000000000001';
const aid = '00000000-0000-4000-8000-000000000002';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const safe = { schema: 1, safe_to_resume: true };
const query = async (sql: string) => (await db.query<Record<string, any>>(sql)).rows;
async function add(n: number, changes: Record<string, unknown> = {}) {
  const row = { id: id(n), user_id: uid, agent_id: aid, status: 'running',
    heartbeat_at: new Date(Date.now() - 30 * 60_000).toISOString(), ...changes };
  const keys = Object.keys(row);
  await db.query(`insert into agent_tasks(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')})`, Object.values(row));
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create function auth.role() returns text language sql stable as $$select current_user::text$$;
    grant usage on schema auth to service_role,authenticated,anon;
    create table personal_agents(id uuid primary key,user_id uuid);
    insert into personal_agents values('${aid}','${uid}');
    create type exec_status as enum ('pending','queued','running','succeeded','failed','cancelled','waiting_for_tool','waiting_for_approval','completed');
    create table agent_tasks(id uuid primary key,user_id uuid,agent_id uuid,org_id uuid,status exec_status,
      heartbeat_at timestamptz,started_at timestamptz,created_at timestamptz default now(),
      checkpoint_state jsonb,resume_count int default 0,cancel_requested boolean default false,
      resume_lease_token uuid,resume_lease_expires_at timestamptz,error text,completed_at timestamptz,resume_last_error text);
    create table mission_audit_logs(user_id uuid,org_id uuid,agent_id uuid,action text,target_type text,target_id text,
      status text check(status in ('success','failed')),metadata jsonb);
    alter table agent_tasks enable row level security;
    alter table personal_agents enable row level security;
    alter table mission_audit_logs enable row level security;
    grant select on personal_agents to service_role;
    grant select,update on agent_tasks to service_role;
    grant insert,select on mission_audit_logs to service_role;`);
  await db.exec(migration);
  await db.exec(correction);
}, 20000);
beforeEach(async () => { await db.exec('reset role; truncate agent_tasks,mission_audit_logs;'); });
afterAll(async () => { await db.close(); });

describe('audited scheduled closure of unrecoverable tasks', () => {
  it.each(['anon','authenticated','postgres'])('denies %s even when tasks are stale', async role => {
    await add(10);
    await db.exec(`set role ${role}`);
    await expect(db.query('select close_unrecoverable_agent_tasks(4)')).rejects.toThrow();
    await db.exec('reset role');
    expect((await query('select status from agent_tasks'))[0]?.['status']).toBe('running');
  });
  it('closes old missing checkpoints once and preserves ownership in required audit', async () => {
    await add(10); await db.exec('set role service_role');
    expect((await query('select close_unrecoverable_agent_tasks(4) as n'))[0]?.['n']).toBe(1);
    expect((await query('select close_unrecoverable_agent_tasks(4) as n'))[0]?.['n']).toBe(0);
    expect((await query('select status,completed_at,resume_last_error from agent_tasks'))[0])
      .toMatchObject({ status: 'failed', resume_last_error: 'missing_checkpoint', completed_at: expect.any(Date) });
    expect((await query('select * from mission_audit_logs'))[0]).toMatchObject({ user_id:uid,agent_id:aid,
      action:'agent.run_recovery_closed',target_id:id(10),status:'failed',metadata:expect.objectContaining({actions_replayed:false}) });
  });
  it('protects safe resumable, approval-paused, fresh, terminal and actively leased tasks', async () => {
    await add(10,{checkpoint_state:safe});
    await add(11,{status:'waiting_for_approval'});
    await add(12,{heartbeat_at:new Date().toISOString()});
    await add(13,{status:'succeeded'});
    await add(14,{resume_lease_token:id(99),resume_lease_expires_at:new Date(Date.now()+600_000).toISOString()});
    await add(15,{user_id:id(999)});
    await db.exec('set role service_role');
    expect((await query('select close_unrecoverable_agent_tasks(4) as n'))[0]?.['n']).toBe(0);
    expect(await query('select * from mission_audit_logs')).toHaveLength(0);
  });
  it('closes unsafe and exhausted runs without replay, and respects cancellation', async () => {
    await add(10,{checkpoint_state:{schema:1,safe_to_resume:false}});
    await add(11,{checkpoint_state:safe,resume_count:3});
    await add(12,{checkpoint_state:safe,cancel_requested:true});
    await add(13,{checkpoint_state:{schema:2,safe_to_resume:true}});
    await db.exec('set role service_role');
    expect((await query('select close_unrecoverable_agent_tasks(4) as n'))[0]?.['n']).toBe(4);
    expect((await query(`select status from agent_tasks where id='${id(12)}'`))[0]?.['status']).toBe('cancelled');
    expect((await query('select metadata->>\'reason\' as reason from mission_audit_logs order by reason')).map(r=>r['reason']))
      .toEqual(['cancellation_requested','resume_attempts_exhausted','unsafe_checkpoint','unsupported_checkpoint']);
  });
  it('rolls back closure when required audit cannot be written', async () => {
    await add(10);
    await db.exec("alter table mission_audit_logs add constraint block_audit check(action <> 'agent.run_recovery_closed');set role service_role;");
    await expect(db.query('select close_unrecoverable_agent_tasks(4)')).rejects.toThrow();
    expect((await query('select status,completed_at from agent_tasks'))[0]).toEqual({status:'running',completed_at:null});
    await db.exec('reset role;alter table mission_audit_logs drop constraint block_audit;');
  });
  it('uses creation time when a legacy task has no heartbeat and bounds the batch', async () => {
    for(let n=10;n<35;n++) await add(n,{heartbeat_at:null,created_at:new Date(Date.now()-1800_000).toISOString()});
    await db.exec('set role service_role');
    expect((await query('select close_unrecoverable_agent_tasks(999) as n'))[0]?.['n']).toBe(20);
    expect((await query('select count(*)::int as n from mission_audit_logs'))[0]?.['n']).toBe(20);
  });
});
