-- Blackstar Enterprise Autonomy policies.
-- These are organisation-scoped policy constraints, not a second runtime.

create table if not exists public.enterprise_autonomy_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null,
  max_concurrent_runs integer not null default 10 check (max_concurrent_runs between 1 and 1000),
  max_daily_spend_micros bigint not null default 0 check (max_daily_spend_micros >= 0),
  require_approval_for_external_writes boolean not null default true,
  require_approval_for_financial_actions boolean not null default true,
  allowed_providers text[] not null default '{}'::text[],
  allowed_capabilities text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

create index if not exists enterprise_autonomy_owner_org_idx on public.enterprise_autonomy_policies(user_id, org_id);

alter table public.enterprise_autonomy_policies enable row level security;
revoke all on public.enterprise_autonomy_policies from anon;
revoke all on public.enterprise_autonomy_policies from authenticated;
grant select, insert, update on public.enterprise_autonomy_policies to authenticated;

create policy "enterprise autonomy owner select"
  on public.enterprise_autonomy_policies for select to authenticated
  using (user_id = auth.uid());
create policy "enterprise autonomy owner insert"
  on public.enterprise_autonomy_policies for insert to authenticated
  with check (user_id = auth.uid());
create policy "enterprise autonomy owner update"
  on public.enterprise_autonomy_policies for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.enterprise_autonomy_policies is 'Organisation-scoped Blackstar autonomy guardrails consumed by the canonical workforce/agent runtime.';
