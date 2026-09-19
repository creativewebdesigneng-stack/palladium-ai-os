-- Restore the two original durable Mission Control reminder tables absent from
-- Blackstar production. Preserve the canonical personal-task status vocabulary.
-- No existing user rows are replaced or reset.

do $$ begin
  create type public.mc_task_status as enum
    ('pending','queued','running','awaiting_approval','completed','failed','cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete set null,
  agent_id uuid references public.personal_agents(id) on delete set null,
  request text not null,
  title text,
  category text not null default 'custom',
  scope text not null default 'personal',
  status public.mc_task_status not null default 'pending',
  priority text not null default 'normal',
  requires_approval boolean not null default false,
  involves_money boolean not null default false,
  required_tools text[] not null default '{}',
  result jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_tasks_user_idx
  on public.personal_tasks(user_id,status);

alter table public.personal_tasks enable row level security;
revoke all on public.personal_tasks from public,anon,authenticated;
grant all on public.personal_tasks to service_role;
grant select,insert,update,delete on public.personal_tasks to authenticated;

drop policy if exists pt_all_own on public.personal_tasks;
create policy pt_all_own on public.personal_tasks
  for all to authenticated
  using (auth.uid()=user_id)
  with check (auth.uid()=user_id);

drop trigger if exists personal_tasks_updated_at on public.personal_tasks;
create trigger personal_tasks_updated_at before update on public.personal_tasks
  for each row execute function public.set_updated_at();

create table if not exists public.personal_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  task_id uuid not null references public.personal_tasks(id) on delete cascade,
  title text not null,
  body text not null,
  due_at timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled'
    check (status in ('scheduled','processing','delivered','cancelled','failed')),
  claimed_at timestamptz,
  delivered_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_reminders_task_id_key unique (task_id)
);

create index if not exists personal_reminders_due_idx
  on public.personal_reminders(due_at,id) where status='scheduled';
create index if not exists personal_reminders_user_idx
  on public.personal_reminders(user_id,created_at desc);

alter table public.personal_reminders enable row level security;
revoke all on public.personal_reminders from public,anon,authenticated;
grant all on public.personal_reminders to service_role;
grant select,insert,update on public.personal_reminders to authenticated;

drop policy if exists "Users can view their own personal reminders"
  on public.personal_reminders;
drop policy if exists "Users can create their own personal reminders"
  on public.personal_reminders;
drop policy if exists "Users can cancel their own personal reminders"
  on public.personal_reminders;

create policy "Users can view their own personal reminders"
  on public.personal_reminders for select to authenticated
  using (auth.uid()=user_id);
create policy "Users can create their own personal reminders"
  on public.personal_reminders for insert to authenticated
  with check (
    auth.uid()=user_id and status='scheduled' and attempts=0
    and claimed_at is null and delivered_at is null and last_error is null
  );
create policy "Users can cancel their own personal reminders"
  on public.personal_reminders for update to authenticated
  using (auth.uid()=user_id and status='scheduled')
  with check (auth.uid()=user_id and status='cancelled' and claimed_at is null);

notify pgrst,'reload schema';
