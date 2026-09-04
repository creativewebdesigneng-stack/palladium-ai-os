-- Blackstar Personal OS user autonomy profile.
-- The profile constrains the existing runtime; it does not execute actions itself.

create table if not exists public.personal_os_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_agent_id uuid null,
  max_daily_spend_micros bigint not null default 0 check (max_daily_spend_micros >= 0),
  require_approval_for_messages boolean not null default true,
  require_approval_for_purchases boolean not null default true,
  require_approval_for_external_writes boolean not null default true,
  allowed_capabilities text[] not null default '{}'::text[],
  quiet_hours_start smallint null check (quiet_hours_start is null or quiet_hours_start between 0 and 23),
  quiet_hours_end smallint null check (quiet_hours_end is null or quiet_hours_end between 0 and 23),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.personal_os_profiles enable row level security;
revoke all on public.personal_os_profiles from anon;
revoke all on public.personal_os_profiles from authenticated;
grant select, insert, update on public.personal_os_profiles to authenticated;

create policy "personal os owner select" on public.personal_os_profiles for select to authenticated using (user_id = auth.uid());
create policy "personal os owner insert" on public.personal_os_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "personal os owner update" on public.personal_os_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.personal_os_profiles is 'Blackstar Personal OS user-owned autonomy and approval preferences consumed by existing agents/goals/runtime.';
