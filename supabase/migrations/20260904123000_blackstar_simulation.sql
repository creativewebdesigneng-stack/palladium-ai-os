-- Blackstar Simulation history.
-- Simulation results are informational planning records only and MUST NOT be used as authorization or execution proof.

create table if not exists public.agent_simulation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid null,
  correlation_id uuid null,
  scenario jsonb not null,
  result jsonb not null,
  status text not null check (status in ('pass','needs_approval','blocked')),
  projected_cost_micros bigint not null check (projected_cost_micros >= 0),
  risk_score integer not null check (risk_score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists agent_simulation_runs_owner_created_idx on public.agent_simulation_runs(user_id, created_at desc);
create index if not exists agent_simulation_runs_agent_created_idx on public.agent_simulation_runs(agent_id, created_at desc) where agent_id is not null;
create index if not exists agent_simulation_runs_correlation_idx on public.agent_simulation_runs(correlation_id) where correlation_id is not null;

alter table public.agent_simulation_runs enable row level security;
revoke all on public.agent_simulation_runs from anon;
revoke all on public.agent_simulation_runs from authenticated;
grant select, insert on public.agent_simulation_runs to authenticated;

create policy "agent simulation owner select"
  on public.agent_simulation_runs for select to authenticated
  using (user_id = auth.uid());

create policy "agent simulation owner insert"
  on public.agent_simulation_runs for insert to authenticated
  with check (user_id = auth.uid());

comment on table public.agent_simulation_runs is 'Append-only owner-scoped Blackstar planning simulations. Informational only; never authoritative for authorization, approvals, billing, or proof of execution.';
