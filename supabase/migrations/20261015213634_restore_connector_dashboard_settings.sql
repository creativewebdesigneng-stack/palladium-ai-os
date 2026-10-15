-- Recover absent existing contracts. Refuse partial recovery rather than
-- overwriting an existing configuration or credential store.
do $$ begin
  if to_regclass('public.integrations') is not null
    or to_regclass('public.integration_credentials') is not null
    or to_regclass('public.dashboard_widgets') is not null
    or to_regclass('public.platform_settings') is not null then
    raise exception 'Connector recovery requires all four tables to be absent; review partial state first.';
  end if;
end $$;

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  name text,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  secret_ref text,
  scopes text[] not null default '{}',
  connected_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  integration_type text not null default 'oauth',
  account_label text,
  granted_scopes text[] not null default '{}',
  last_error text,
  expires_at timestamptz,
  unique(user_id,provider)
);
create index integrations_org_idx on public.integrations(org_id) where org_id is not null;
alter table public.integrations enable row level security;
revoke all on public.integrations from public,anon,authenticated;
grant select,insert,update,delete on public.integrations to authenticated;
grant all on public.integrations to service_role;
-- OAuth metadata belongs to its owner; organisation membership is not consent
-- to read another user's connection config. Validate organisation on writes.
create policy integrations_select_own on public.integrations for select to authenticated
  using(user_id=(select auth.uid()));
create policy integrations_insert_own on public.integrations for insert to authenticated
  with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy integrations_update_own on public.integrations for update to authenticated
  using(user_id=(select auth.uid()))
  with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy integrations_delete_own on public.integrations for delete to authenticated
  using(user_id=(select auth.uid()));
create trigger integrations_updated_at before update on public.integrations
  for each row execute function public.set_updated_at();

create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  user_id uuid not null,
  provider text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_type text not null default 'Bearer',
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,provider)
);
create index integration_credentials_integration_idx on public.integration_credentials(integration_id);
alter table public.integration_credentials enable row level security;
revoke all on public.integration_credentials from public,anon,authenticated;
grant all on public.integration_credentials to service_role;
create trigger integration_credentials_updated_at before update on public.integration_credentials
  for each row execute function public.set_updated_at();

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 120),
  kind text not null check(kind in ('link','status','metric','note')),
  target_url text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dashboard_widgets_user_idx on public.dashboard_widgets(user_id,sort_order,created_at);
alter table public.dashboard_widgets enable row level security;
revoke all on public.dashboard_widgets from public,anon,authenticated;
grant select,insert,update,delete on public.dashboard_widgets to authenticated;
grant all on public.dashboard_widgets to service_role;
create policy dashboard_widgets_owner on public.dashboard_widgets for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table public.platform_settings (
  key text primary key check(char_length(key) between 1 and 80),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index platform_settings_updated_by_idx on public.platform_settings(updated_by) where updated_by is not null;
alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from public,anon,authenticated;
grant all on public.platform_settings to service_role;
insert into public.platform_settings(key,value) values('announcement','{"enabled":false,"text":"","tone":"info"}');
-- No connection, token, widget, tool grant or enabled announcement is backfilled.
notify pgrst,'reload schema';
