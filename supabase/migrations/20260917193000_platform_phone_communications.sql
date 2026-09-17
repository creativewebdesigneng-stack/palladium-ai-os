create table if not exists public.communication_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  ai_calls_enabled boolean not null default false,
  project_updates boolean not null default true,
  agent_updates boolean not null default true,
  business_updates boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  max_daily_sms integer not null default 10 check (max_daily_sms between 0 and 100),
  max_daily_calls integer not null default 3 check (max_daily_calls between 0 and 25),
  retain_call_transcript boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'My mobile' check (char_length(label) between 1 and 80),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz,
  sms_consent_at timestamptz,
  voice_consent_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, phone_e164)
);

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid references public.communication_recipients(id) on delete set null,
  channel text not null check (channel in ('push','sms','voice')),
  purpose text not null check (purpose in ('project_update','agent_update','business_update','approval','reminder','custom')),
  source_type text,
  source_id text,
  title text,
  body text,
  call_objective text,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','ringing','in_progress','completed','failed','cancelled')),
  provider text,
  provider_id text,
  error text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  sent_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_call_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.communication_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'twilio',
  provider_call_sid text,
  status text not null default 'queued' check (status in ('queued','ringing','in_progress','completed','failed','cancelled')),
  call_objective text not null check (char_length(call_objective) between 1 and 2000),
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array'),
  turn_count integer not null default 0 check (turn_count between 0 and 100),
  retain_transcript boolean not null default false,
  disclosure_sent boolean not null default false,
  summary text,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_recipients_user_idx on public.communication_recipients(user_id, disabled_at);
create index if not exists communication_events_user_created_idx on public.communication_events(user_id, created_at desc);
create index if not exists communication_events_provider_idx on public.communication_events(provider, provider_id) where provider_id is not null;
create index if not exists communication_call_sessions_user_idx on public.communication_call_sessions(user_id, created_at desc);
create unique index if not exists communication_call_sessions_provider_sid_uidx on public.communication_call_sessions(provider, provider_call_sid) where provider_call_sid is not null;

alter table public.communication_preferences enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.communication_events enable row level security;
alter table public.communication_call_sessions enable row level security;

create policy "communication preferences owner read" on public.communication_preferences for select to authenticated using (auth.uid() = user_id);
create policy "communication preferences owner insert" on public.communication_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "communication preferences owner update" on public.communication_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "communication recipients owner read" on public.communication_recipients for select to authenticated using (auth.uid() = user_id);
create policy "communication recipients owner insert" on public.communication_recipients for insert to authenticated with check (auth.uid() = user_id);
create policy "communication recipients owner update" on public.communication_recipients for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication recipients owner delete" on public.communication_recipients for delete to authenticated using (auth.uid() = user_id);

create policy "communication events owner read" on public.communication_events for select to authenticated using (auth.uid() = user_id);
create policy "communication events owner insert" on public.communication_events for insert to authenticated with check (auth.uid() = user_id);
create policy "communication events owner update" on public.communication_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "communication call sessions owner read" on public.communication_call_sessions for select to authenticated using (auth.uid() = user_id);

revoke all on table public.communication_preferences from anon;
revoke all on table public.communication_recipients from anon;
revoke all on table public.communication_events from anon;
revoke all on table public.communication_call_sessions from anon;

grant select, insert, update on table public.communication_preferences to authenticated;
grant select, insert, update, delete on table public.communication_recipients to authenticated;
grant select, insert, update on table public.communication_events to authenticated;
grant select on table public.communication_call_sessions to authenticated;
