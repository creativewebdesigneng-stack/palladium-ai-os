alter table public.autonomous_goals
  add column if not exists scheduler_claimed_at timestamptz,
  add column if not exists scheduler_lease_until timestamptz,
  add column if not exists scheduler_attempts integer not null default 0,
  add column if not exists last_scheduler_error text;

alter table public.autonomous_goal_runs
  add column if not exists queued_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists attempt integer not null default 1;

create table if not exists public.autonomous_goal_fleet_assignments (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.autonomous_goals(id) on delete cascade,
  run_id uuid not null references public.autonomous_goal_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  assignment_id text not null,
  title text not null,
  objective text not null,
  depends_on jsonb not null default '[]'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  requires_approval boolean not null default false,
  status text not null default 'planned' check (status in ('planned','queued','running','waiting_for_approval','completed','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, assignment_id)
);

create index if not exists autonomous_goals_scheduler_due_idx
  on public.autonomous_goals(next_run_at, scheduler_lease_until)
  where status = 'active' and trigger_type in ('schedule','continuous');
create index if not exists autonomous_goal_fleet_run_idx
  on public.autonomous_goal_fleet_assignments(run_id, created_at);
create index if not exists autonomous_goal_fleet_goal_idx
  on public.autonomous_goal_fleet_assignments(goal_id, created_at desc);

alter table public.autonomous_goal_fleet_assignments enable row level security;

drop policy if exists "autonomous_goal_fleet_owner_select" on public.autonomous_goal_fleet_assignments;
drop policy if exists "autonomous_goal_fleet_owner_insert" on public.autonomous_goal_fleet_assignments;
drop policy if exists "autonomous_goal_fleet_owner_update" on public.autonomous_goal_fleet_assignments;
drop policy if exists "autonomous_goal_fleet_owner_delete" on public.autonomous_goal_fleet_assignments;
create policy "autonomous_goal_fleet_owner_select" on public.autonomous_goal_fleet_assignments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "autonomous_goal_fleet_owner_insert" on public.autonomous_goal_fleet_assignments
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "autonomous_goal_fleet_owner_update" on public.autonomous_goal_fleet_assignments
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "autonomous_goal_fleet_owner_delete" on public.autonomous_goal_fleet_assignments
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists autonomous_goal_fleet_touch_updated_at on public.autonomous_goal_fleet_assignments;
create trigger autonomous_goal_fleet_touch_updated_at before update on public.autonomous_goal_fleet_assignments
for each row execute function public.touch_autonomous_os_updated_at();

comment on column public.autonomous_goals.scheduler_lease_until is 'Short lease preventing duplicate scheduler claims across concurrent workers.';
comment on table public.autonomous_goal_fleet_assignments is 'Persistent specialist assignments selected for each Autonomous OS goal run.';

notify pgrst, 'reload schema';