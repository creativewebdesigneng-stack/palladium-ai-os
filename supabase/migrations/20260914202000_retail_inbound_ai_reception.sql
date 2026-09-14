-- Blackstar Retail: server-managed inbound AI receptionist telephony state.
-- Twilio number bindings and live call sessions are not client-mutable. Public
-- webhooks use the service role only after provider-signature verification.

create table public.retail_reception_voice_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  profile_id uuid not null references public.retail_reception_profiles(id) on delete cascade,
  provider text not null default 'twilio' check (provider = 'twilio'),
  phone_number text not null check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  provider_phone_sid text not null check (provider_phone_sid ~ '^PN[0-9A-Fa-f]{32}$'),
  active boolean not null default true,
  webhook_configured boolean not null default false,
  last_verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index retail_reception_voice_endpoint_number_uq
  on public.retail_reception_voice_endpoints(provider, phone_number);
create unique index retail_reception_voice_endpoint_sid_uq
  on public.retail_reception_voice_endpoints(provider, provider_phone_sid);
create unique index retail_reception_voice_endpoint_profile_uq
  on public.retail_reception_voice_endpoints(profile_id);
create index retail_reception_voice_endpoints_workspace_idx
  on public.retail_reception_voice_endpoints(workspace_id, active, updated_at desc);
create index retail_reception_voice_endpoints_user_idx
  on public.retail_reception_voice_endpoints(user_id, updated_at desc);

create table public.retail_reception_voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.retail_workspaces(id) on delete cascade,
  profile_id uuid not null references public.retail_reception_profiles(id) on delete cascade,
  endpoint_id uuid not null references public.retail_reception_voice_endpoints(id) on delete cascade,
  call_id uuid references public.retail_call_inbox(id) on delete set null,
  provider text not null default 'twilio' check (provider = 'twilio'),
  provider_call_sid text not null check (provider_call_sid ~ '^CA[0-9A-Fa-f]{32}$'),
  caller_phone text check (caller_phone is null or caller_phone ~ '^\+[1-9][0-9]{7,14}$'),
  called_phone text not null check (called_phone ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'ringing' check (status in ('ringing','in_progress','completed','failed')),
  turn_count integer not null default 0 check (turn_count between 0 and 20),
  history jsonb not null default '[]'::jsonb,
  last_transcript text,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index retail_reception_voice_session_call_uq
  on public.retail_reception_voice_sessions(provider, provider_call_sid);
create index retail_reception_voice_sessions_workspace_idx
  on public.retail_reception_voice_sessions(workspace_id, status, updated_at desc);
create index retail_reception_voice_sessions_user_idx
  on public.retail_reception_voice_sessions(user_id, updated_at desc);
create index retail_reception_voice_sessions_profile_fk_idx
  on public.retail_reception_voice_sessions(profile_id);
create index retail_reception_voice_sessions_endpoint_fk_idx
  on public.retail_reception_voice_sessions(endpoint_id);
create index retail_reception_voice_sessions_call_fk_idx
  on public.retail_reception_voice_sessions(call_id);

create trigger retail_reception_voice_endpoints_set_updated_at
before update on public.retail_reception_voice_endpoints
for each row execute function public.retail_set_updated_at();

create trigger retail_reception_voice_sessions_set_updated_at
before update on public.retail_reception_voice_sessions
for each row execute function public.retail_set_updated_at();

alter table public.retail_reception_voice_endpoints enable row level security;
alter table public.retail_reception_voice_endpoints force row level security;
alter table public.retail_reception_voice_sessions enable row level security;
alter table public.retail_reception_voice_sessions force row level security;

revoke all on table public.retail_reception_voice_endpoints from public, anon, authenticated;
revoke all on table public.retail_reception_voice_sessions from public, anon, authenticated;
grant select on table public.retail_reception_voice_endpoints to authenticated;
grant select on table public.retail_reception_voice_sessions to authenticated;
grant all on table public.retail_reception_voice_endpoints, public.retail_reception_voice_sessions to service_role;

create policy retail_reception_voice_endpoints_select_own
on public.retail_reception_voice_endpoints
for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.retail_workspaces w
    where w.id = workspace_id and w.user_id = (select auth.uid())
  )
);

create policy retail_reception_voice_sessions_select_own
on public.retail_reception_voice_sessions
for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.retail_workspaces w
    where w.id = workspace_id and w.user_id = (select auth.uid())
  )
);
