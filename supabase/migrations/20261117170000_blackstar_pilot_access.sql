-- Server-owned Founding Pilot entitlement and per-account beta grants.
create table if not exists public.blackstar_pilot_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text not null unique,
  status text not null check (status in ('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused')),
  environment text not null check (environment in ('test','live')),
  beta_features text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop index if exists public.blackstar_pilot_access_customer_env_uidx;
create index if not exists blackstar_pilot_access_customer_env_idx
  on public.blackstar_pilot_access(stripe_customer_id, environment)
  where stripe_customer_id is not null;
create unique index if not exists blackstar_pilot_access_user_env_active_uidx
  on public.blackstar_pilot_access(user_id, environment)
  where status in ('active', 'trialing');

alter table public.blackstar_pilot_access enable row level security;
revoke all on public.blackstar_pilot_access from anon, authenticated;
grant select on public.blackstar_pilot_access to authenticated;
grant all on public.blackstar_pilot_access to service_role;
drop policy if exists "Users can read their own pilot entitlement" on public.blackstar_pilot_access;
create policy "Users can read their own pilot entitlement"
  on public.blackstar_pilot_access for select to authenticated
  using (auth.uid() = user_id);

comment on table public.blackstar_pilot_access is
  'Founding Pilot access written only by verified Stripe webhook/service-role processes. beta_features is an administrator-managed per-user allowlist.';
