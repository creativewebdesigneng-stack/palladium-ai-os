-- Reconcile Blackstar's original outbound webhook runtime tables into production.
-- The source tables from the August baseline were absent despite their worker
-- and UI routes being deployed. This migration creates only those missing tables,
-- retains user-owned RLS, and protects the raw signing secret from client reads.
-- Existing webhook rows and credentials, if any, are never replaced.

create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  events text[] not null default '{}'::text[],
  secret_hash text,
  signing_secret text,
  name text,
  secret_prefix text,
  is_active boolean not null default true,
  last_delivery_at timestamptz,
  failure_count integer not null default 0,
  delivery_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists webhooks_user_idx
  on public.webhooks(user_id,created_at desc);

alter table public.webhooks enable row level security;

revoke all on public.webhooks from public, anon, authenticated;
grant all on public.webhooks to service_role;
grant select (
  id,org_id,user_id,url,events,name,secret_prefix,is_active,
  last_delivery_at,failure_count,delivery_count,created_at,updated_at
) on public.webhooks to authenticated;
grant insert,update,delete on public.webhooks to authenticated;

drop policy if exists webhooks_owner_select on public.webhooks;
drop policy if exists webhooks_owner_insert on public.webhooks;
drop policy if exists webhooks_owner_update on public.webhooks;
drop policy if exists webhooks_owner_delete on public.webhooks;

create policy webhooks_owner_select on public.webhooks
  for select to authenticated using (user_id=auth.uid());
create policy webhooks_owner_insert on public.webhooks
  for insert to authenticated with check (user_id=auth.uid() and org_id is null);
create policy webhooks_owner_update on public.webhooks
  for update to authenticated using (user_id=auth.uid())
  with check (user_id=auth.uid() and org_id is null);
create policy webhooks_owner_delete on public.webhooks
  for delete to authenticated using (user_id=auth.uid());

drop trigger if exists webhooks_updated_at on public.webhooks;
create trigger webhooks_updated_at before update on public.webhooks
  for each row execute function public.set_updated_at();

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  response_status integer,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  dead_lettered_at timestamptz
);

create index if not exists webhook_deliveries_user_created_idx
  on public.webhook_deliveries(user_id,created_at desc);
create index if not exists webhook_deliveries_hook_created_idx
  on public.webhook_deliveries(webhook_id,created_at desc);
create index if not exists webhook_deliveries_due_retry_idx
  on public.webhook_deliveries(next_attempt_at)
  where status='failed' and next_attempt_at is not null and dead_lettered_at is null;

alter table public.webhook_deliveries enable row level security;

revoke all on public.webhook_deliveries from public,anon,authenticated;
grant all on public.webhook_deliveries to service_role;
grant select on public.webhook_deliveries to authenticated;
drop policy if exists webhook_deliveries_owner_select on public.webhook_deliveries;
create policy webhook_deliveries_owner_select on public.webhook_deliveries
  for select to authenticated using (user_id=auth.uid());

notify pgrst,'reload schema';
