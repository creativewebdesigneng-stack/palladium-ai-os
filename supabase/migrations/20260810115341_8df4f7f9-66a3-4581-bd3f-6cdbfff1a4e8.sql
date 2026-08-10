-- Stripe-facing columns on subscriptions
alter table public.subscriptions
  add column if not exists environment text not null default 'sandbox',
  add column if not exists stripe_price_id text,
  add column if not exists stripe_product_id text;

alter table public.subscriptions
  add constraint subscriptions_environment_check check (environment in ('sandbox','live'));

create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

create index if not exists idx_subscriptions_user_env on public.subscriptions (user_id, environment);
create index if not exists idx_subscriptions_org_env on public.subscriptions (org_id, environment);

-- Map plans to checkout price ids (human readable lookup keys)
alter table public.plans
  add column if not exists stripe_price_id_yearly text;

update public.plans set stripe_price_id = 'pro_monthly', stripe_price_id_yearly = 'pro_yearly' where code = 'pro';
update public.plans set stripe_price_id = 'business_monthly', stripe_price_id_yearly = 'business_yearly' where code = 'business';
update public.plans set stripe_price_id = 'enterprise_monthly', stripe_price_id_yearly = 'enterprise_yearly' where code = 'enterprise';

-- Active-subscription helper
create or replace function public.has_active_subscription(_user uuid, _env text default 'live')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = _user
      and s.environment = _env
      and (
        (s.status in ('active','trialing','past_due') and (s.current_period_end is null or s.current_period_end > now()))
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  )
$$;

revoke all on function public.has_active_subscription(uuid, text) from public, anon;
grant execute on function public.has_active_subscription(uuid, text) to authenticated, service_role;

-- Usage recording helper (server-side use)
create or replace function public.record_usage(
  _user uuid,
  _metric text,
  _quantity numeric,
  _unit text default 'count',
  _org uuid default null,
  _metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare _id uuid;
begin
  insert into public.usage_records (user_id, org_id, metric, quantity, unit, period_start, metadata)
  values (_user, _org, _metric, _quantity, _unit, date_trunc('month', now())::date, _metadata)
  returning id into _id;
  return _id;
end $$;

revoke all on function public.record_usage(uuid, text, numeric, text, uuid, jsonb) from public, anon;
grant execute on function public.record_usage(uuid, text, numeric, text, uuid, jsonb) to service_role;