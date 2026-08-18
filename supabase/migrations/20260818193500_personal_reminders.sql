-- Durable one-shot reminders created from explicit Mission Control reminder requests.
-- Delivery is performed by the existing authenticated workflow worker endpoint.

create table if not exists public.personal_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  task_id uuid not null references public.personal_tasks(id) on delete cascade,
  title text not null,
  body text not null,
  due_at timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'delivered', 'cancelled', 'failed')),
  claimed_at timestamptz null,
  delivered_at timestamptz null,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_reminders_task_id_key unique (task_id)
);

create index if not exists personal_reminders_due_idx
  on public.personal_reminders (due_at, id)
  where status = 'scheduled';

create index if not exists personal_reminders_user_idx
  on public.personal_reminders (user_id, created_at desc);

alter table public.personal_reminders enable row level security;

create policy "Users can view their own personal reminders"
  on public.personal_reminders
  for select
  using (auth.uid() = user_id);

create policy "Users can create their own personal reminders"
  on public.personal_reminders
  for insert
  with check (
    auth.uid() = user_id
    and status = 'scheduled'
    and attempts = 0
    and claimed_at is null
    and delivered_at is null
    and last_error is null
  );

create policy "Users can cancel their own personal reminders"
  on public.personal_reminders
  for update
  using (
    auth.uid() = user_id
    and status = 'scheduled'
  )
  with check (
    auth.uid() = user_id
    and status = 'cancelled'
    and claimed_at is null
  );

comment on table public.personal_reminders is
  'Durable one-shot reminders scheduled by explicit Mission Control reminder requests.';
