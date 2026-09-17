create table if not exists public.mobile_intelligence_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  platform text not null check (platform in ('ios','android')),
  os_version text not null,
  native_intelligence_available boolean not null default false,
  native_provider text,
  capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
  app_actions_available boolean not null default false,
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobile_intelligence_devices_user_idx
  on public.mobile_intelligence_devices(user_id, revoked_at);

alter table public.mobile_intelligence_devices enable row level security;

create policy "mobile devices owner read" on public.mobile_intelligence_devices
  for select to authenticated using (auth.uid() = user_id);
create policy "mobile devices owner insert" on public.mobile_intelligence_devices
  for insert to authenticated with check (auth.uid() = user_id);
create policy "mobile devices owner update" on public.mobile_intelligence_devices
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mobile devices owner delete" on public.mobile_intelligence_devices
  for delete to authenticated using (auth.uid() = user_id);

revoke all on table public.mobile_intelligence_devices from anon;
grant select, insert, update, delete on table public.mobile_intelligence_devices to authenticated;
