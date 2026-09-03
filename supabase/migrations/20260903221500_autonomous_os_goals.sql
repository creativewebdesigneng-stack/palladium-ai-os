create table if not exists public.autonomous_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  workforce_id uuid references public.workforces(id) on delete set null,
  name text not null,
  objective text not null,
  status text not null default 'active' check (status in ('draft','active','paused','completed','failed','cancelled')),
  autonomy_level text not null default 'guarded' check (autonomy_level in ('assisted','guarded','autonomous')),
  trigger_type text not null default 'manual' check (trigger_type in ('manual','schedule','event','continuous')),
  trigger_config jsonb not null default '{}'::jsonb,
  schedule_cron text,
  timezone text not null default 'UTC',
  next_run_at timestamptz,
  last_run_at timestamptz,
  max_parallel_agents integer not null default 4 check (max_parallel_agents between 1 and 12),
  max_runtime_seconds integer not null default 3600 check (max_runtime_seconds between 30 and 86400),
  budget_pence integer check (budget_pence is null or budget_pence >= 0),
  require_approval_for_external_actions boolean not null default true,
  allow_replanning boolean not null default true,
  context jsonb not null default '{}'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.autonomous_goal_runs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.autonomous_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_id uuid references public.workflows(id) on delete set null,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','planning','running','waiting_for_approval','completed','failed','cancelled')),
  trigger text not null default 'manual',
  plan jsonb,
  summary text,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.autonomous_goal_events (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.autonomous_goals(id) on delete cascade,
  run_id uuid references public.autonomous_goal_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','error','success')),
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists autonomous_goals_user_status_idx on public.autonomous_goals(user_id, status, updated_at desc);
create index if not exists autonomous_goals_due_idx on public.autonomous_goals(next_run_at) where status = 'active' and next_run_at is not null;
create index if not exists autonomous_goal_runs_goal_idx on public.autonomous_goal_runs(goal_id, created_at desc);
create index if not exists autonomous_goal_runs_user_status_idx on public.autonomous_goal_runs(user_id, status, created_at desc);
create index if not exists autonomous_goal_events_goal_idx on public.autonomous_goal_events(goal_id, created_at desc);

alter table public.autonomous_goals enable row level security;
alter table public.autonomous_goal_runs enable row level security;
alter table public.autonomous_goal_events enable row level security;

drop policy if exists "autonomous_goals_owner_select" on public.autonomous_goals;
drop policy if exists "autonomous_goals_owner_insert" on public.autonomous_goals;
drop policy if exists "autonomous_goals_owner_update" on public.autonomous_goals;
drop policy if exists "autonomous_goals_owner_delete" on public.autonomous_goals;
create policy "autonomous_goals_owner_select" on public.autonomous_goals for select using (auth.uid() = user_id);
create policy "autonomous_goals_owner_insert" on public.autonomous_goals for insert with check (auth.uid() = user_id);
create policy "autonomous_goals_owner_update" on public.autonomous_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "autonomous_goals_owner_delete" on public.autonomous_goals for delete using (auth.uid() = user_id);

drop policy if exists "autonomous_goal_runs_owner_select" on public.autonomous_goal_runs;
drop policy if exists "autonomous_goal_runs_owner_insert" on public.autonomous_goal_runs;
drop policy if exists "autonomous_goal_runs_owner_update" on public.autonomous_goal_runs;
drop policy if exists "autonomous_goal_runs_owner_delete" on public.autonomous_goal_runs;
create policy "autonomous_goal_runs_owner_select" on public.autonomous_goal_runs for select using (auth.uid() = user_id);
create policy "autonomous_goal_runs_owner_insert" on public.autonomous_goal_runs for insert with check (auth.uid() = user_id);
create policy "autonomous_goal_runs_owner_update" on public.autonomous_goal_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "autonomous_goal_runs_owner_delete" on public.autonomous_goal_runs for delete using (auth.uid() = user_id);

drop policy if exists "autonomous_goal_events_owner_select" on public.autonomous_goal_events;
drop policy if exists "autonomous_goal_events_owner_insert" on public.autonomous_goal_events;
create policy "autonomous_goal_events_owner_select" on public.autonomous_goal_events for select using (auth.uid() = user_id);
create policy "autonomous_goal_events_owner_insert" on public.autonomous_goal_events for insert with check (auth.uid() = user_id);

create or replace function public.touch_autonomous_os_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists autonomous_goals_touch_updated_at on public.autonomous_goals;
create trigger autonomous_goals_touch_updated_at before update on public.autonomous_goals
for each row execute function public.touch_autonomous_os_updated_at();

drop trigger if exists autonomous_goal_runs_touch_updated_at on public.autonomous_goal_runs;
create trigger autonomous_goal_runs_touch_updated_at before update on public.autonomous_goal_runs
for each row execute function public.touch_autonomous_os_updated_at();

comment on table public.autonomous_goals is 'Persistent Autonomous OS objectives orchestrated through the existing Blackstar workforce runtime.';
comment on table public.autonomous_goal_runs is 'Execution history linking persistent goals to generated workflows and workflow runs.';
comment on table public.autonomous_goal_events is 'Auditable progress and state-change events for autonomous goals.';

notify pgrst, 'reload schema';
