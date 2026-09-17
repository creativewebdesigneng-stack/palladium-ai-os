create table if not exists public.communication_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed')),
  attempts integer not null default 0 check (attempts between 0 and 10),
  available_at timestamptz not null default now(),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists communication_notification_jobs_due_idx
  on public.communication_notification_jobs(status, available_at, created_at)
  where status in ('queued','failed');
create index if not exists communication_notification_jobs_user_idx
  on public.communication_notification_jobs(user_id, created_at desc);

alter table public.communication_notification_jobs enable row level security;

drop policy if exists "communication notification jobs owner read" on public.communication_notification_jobs;
create policy "communication notification jobs owner read"
  on public.communication_notification_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.communication_notification_jobs from anon;
revoke all on table public.communication_notification_jobs from authenticated;
grant select on table public.communication_notification_jobs to authenticated;

create or replace function public.enqueue_phone_communication_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.communication_notification_jobs(notification_id, user_id)
  values (new.id, new.user_id)
  on conflict (notification_id) do nothing;
  return new;
end;
$$;

revoke all on function public.enqueue_phone_communication_notification() from public;
revoke all on function public.enqueue_phone_communication_notification() from anon;
revoke all on function public.enqueue_phone_communication_notification() from authenticated;

drop trigger if exists notifications_enqueue_phone_communication on public.notifications;
create trigger notifications_enqueue_phone_communication
after insert on public.notifications
for each row execute function public.enqueue_phone_communication_notification();

create or replace function public.claim_phone_communication_notification_jobs(max_jobs integer default 10)
returns setof public.communication_notification_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.communication_notification_jobs j
    where j.status in ('queued','failed')
      and j.available_at <= now()
      and j.attempts < 5
    order by j.available_at asc, j.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(max_jobs, 10), 25))
  )
  update public.communication_notification_jobs j
  set status = 'processing',
      attempts = j.attempts + 1,
      updated_at = now(),
      last_error = null
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

revoke all on function public.claim_phone_communication_notification_jobs(integer) from public;
revoke all on function public.claim_phone_communication_notification_jobs(integer) from anon;
revoke all on function public.claim_phone_communication_notification_jobs(integer) from authenticated;
grant execute on function public.claim_phone_communication_notification_jobs(integer) to service_role;
