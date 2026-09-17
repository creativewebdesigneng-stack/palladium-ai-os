create table if not exists public.mobile_intelligence_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.mobile_intelligence_devices(id) on delete set null,
  request_id text not null check (char_length(request_id) between 1 and 128),
  capability text not null,
  risk text not null check (risk in ('low','medium','high')),
  execution_target text not null check (execution_target in ('device','astra','hybrid')),
  approval_required boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists mobile_intelligence_audit_user_created_idx
  on public.mobile_intelligence_audit_events(user_id, created_at desc);

alter table public.mobile_intelligence_audit_events enable row level security;
create policy "mobile audit owner read" on public.mobile_intelligence_audit_events
  for select to authenticated using (auth.uid() = user_id);
create policy "mobile audit owner insert" on public.mobile_intelligence_audit_events
  for insert to authenticated with check (auth.uid() = user_id);

revoke all on table public.mobile_intelligence_audit_events from anon;
grant select, insert on table public.mobile_intelligence_audit_events to authenticated;
