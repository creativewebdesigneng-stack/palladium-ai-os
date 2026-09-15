-- Blackstar Health & Fitness Hub: private reminders.
create table public.health_reminders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 reminder_type text not null check (reminder_type in ('workout','nutrition','hydration','sleep','medication','appointment','measurement','habit','other')),
 title text not null check (char_length(title) between 1 and 180),
 notes text,
 scheduled_for timestamptz not null,
 recurrence text not null default 'none' check (recurrence in ('none','daily','weekly','monthly')),
 status text not null default 'active' check (status in ('active','completed','dismissed','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index health_reminders_user_schedule_idx on public.health_reminders(user_id,status,scheduled_for);
alter table public.health_reminders enable row level security;
alter table public.health_reminders force row level security;
revoke all on table public.health_reminders from anon, authenticated;
grant select,insert,update,delete on table public.health_reminders to authenticated;
grant all on table public.health_reminders to service_role;
create policy health_reminders_select_own on public.health_reminders for select to authenticated using ((select auth.uid())=user_id);
create policy health_reminders_insert_own on public.health_reminders for insert to authenticated with check ((select auth.uid())=user_id);
create policy health_reminders_update_own on public.health_reminders for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy health_reminders_delete_own on public.health_reminders for delete to authenticated using ((select auth.uid())=user_id);