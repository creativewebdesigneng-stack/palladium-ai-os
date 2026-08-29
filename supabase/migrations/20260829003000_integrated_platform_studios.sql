-- Native PalladiumAI foundations inspired by the audited integration batch.
-- No GPL/AGPL/Enterprise source is imported; these tables belong to PalladiumAI.

create table if not exists public.quant_strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  asset_class text not null default 'multi-asset',
  universe text[] not null default '{}',
  base_currency text not null default 'GBP' check (char_length(base_currency) = 3),
  risk_target numeric not null default 0.10 check (risk_target > 0 and risk_target <= 1),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quant_backtest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  strategy_id uuid not null references public.quant_strategies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  starting_capital numeric not null check (starting_capital > 0),
  status text not null default 'completed' check (status in ('queued','running','completed','failed')),
  metrics jsonb not null default '{}'::jsonb,
  equity_curve jsonb not null default '[]'::jsonb,
  error text null,
  created_at timestamptz not null default now(),
  constraint quant_backtest_period check (period_end > period_start)
);

create table if not exists public.sync_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  provider text not null check (provider in ('syncthing','integration','mcp')),
  name text not null check (char_length(name) between 1 and 120),
  connection_ref text null,
  local_root text not null,
  remote_root text not null,
  direction text not null default 'bidirectional' check (direction in ('bidirectional','push','pull')),
  status text not null default 'configured' check (status in ('configured','syncing','idle','error','disabled')),
  last_synced_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  provider text not null check (provider in ('shopify','medusa','integration','mcp')),
  name text not null check (char_length(name) between 1 and 120),
  connection_ref text null,
  currency text not null default 'GBP' check (char_length(currency) = 3),
  status text not null default 'connected' check (status in ('connected','needs_connection','disabled','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remote_developer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  provider text not null check (provider in ('palladium','happy','openhands')),
  label text not null check (char_length(label) between 1 and 120),
  connection_ref text null,
  status text not null default 'offline' check (status in ('offline','connecting','online','error','closed')),
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_timeline_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  media_job_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'value' check (kind in ('value','camera','audio','event')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_timeline_keyframes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  track_id uuid not null references public.media_timeline_tracks(id) on delete cascade,
  time_ms integer not null check (time_ms >= 0 and time_ms <= 86400000),
  value jsonb not null default '{}'::jsonb,
  interpolation text not null default 'linear' check (interpolation in ('step','linear','smooth')),
  created_at timestamptz not null default now(),
  unique(track_id, time_ms)
);

create table if not exists public.web_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  org_id uuid null,
  source_url text not null,
  content_hash text not null,
  excerpt text null,
  selectors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quant_backtest_runs_owner_created_idx on public.quant_backtest_runs(user_id, created_at desc);
create index if not exists sync_connections_owner_idx on public.sync_connections(user_id, updated_at desc);
create index if not exists commerce_workspaces_owner_idx on public.commerce_workspaces(user_id, updated_at desc);
create index if not exists remote_developer_sessions_owner_idx on public.remote_developer_sessions(user_id, updated_at desc);
create index if not exists media_timeline_tracks_owner_idx on public.media_timeline_tracks(user_id, updated_at desc);
create index if not exists media_timeline_keyframes_track_idx on public.media_timeline_keyframes(track_id, time_ms);
create index if not exists web_intelligence_snapshots_owner_source_idx on public.web_intelligence_snapshots(user_id, source_url, created_at desc);

alter table public.quant_strategies enable row level security;
alter table public.quant_backtest_runs enable row level security;
alter table public.sync_connections enable row level security;
alter table public.commerce_workspaces enable row level security;
alter table public.remote_developer_sessions enable row level security;
alter table public.media_timeline_tracks enable row level security;
alter table public.media_timeline_keyframes enable row level security;
alter table public.web_intelligence_snapshots enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'quant_strategies','quant_backtest_runs','sync_connections','commerce_workspaces',
    'remote_developer_sessions','media_timeline_tracks','media_timeline_keyframes','web_intelligence_snapshots'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format('create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_owner_all', t);
  end loop;
end $$;
