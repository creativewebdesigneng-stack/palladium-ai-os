-- Forward reconciliation for production environments that received newer Blackstar
-- feature migrations before the original workspace/platform foundation.
-- This migration is additive/idempotent and restores only contracts required by
-- the authenticated shell, Projects and native Project Repository hub.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$ begin new.updated_at = now(); return new; end $$;

do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='org_role') then
    create type public.org_role as enum ('owner','admin','member');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='app_role') then
    create type public.app_role as enum ('admin','moderator','user');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='subscription_status') then
    create type public.subscription_status as enum ('trialing','active','past_due','canceled','incomplete','unpaid','paused');
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='exec_status') then
    create type public.exec_status as enum ('pending','queued','running','succeeded','failed','cancelled','waiting_for_tool','waiting_for_approval','completed');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user',
  org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id=(select auth.uid()));
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id=(select auth.uid()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

create or replace function private.sync_auth_profile()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles(id,email,full_name,avatar_url)
  values (new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'full_name',''),new.raw_user_meta_data->>'avatar_url')
  on conflict(id) do update set
    email=excluded.email,
    full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name),
    avatar_url=coalesce(excluded.avatar_url,public.profiles.avatar_url),
    updated_at=now();
  return new;
end $$;
revoke all on function private.sync_auth_profile() from public;
drop trigger if exists blackstar_sync_auth_profile on auth.users;
create trigger blackstar_sync_auth_profile after insert or update of email,raw_user_meta_data on auth.users
for each row execute function private.sync_auth_profile();

insert into public.profiles(id,email,full_name,avatar_url)
select u.id,lower(u.email),coalesce(u.raw_user_meta_data->>'full_name',''),u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict(id) do update set email=excluded.email, updated_at=now();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id,role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated using (user_id=(select auth.uid()));

create or replace function public.has_role(_user_id uuid,_role public.app_role)
returns boolean language sql stable security invoker
set search_path=pg_catalog,public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
revoke all on function public.has_role(uuid,public.app_role) from public,anon;
grant execute on function public.has_role(uuid,public.app_role) to authenticated;

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  logo_url text,
  billing_email text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id,user_id)
);

create or replace function private.is_org_member(_org uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public
as $$ select _org is not null and exists(select 1 from public.organisation_members where org_id=_org and user_id=(select auth.uid())) $$;
create or replace function private.is_org_admin(_org uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public
as $$ select _org is not null and exists(select 1 from public.organisation_members where org_id=_org and user_id=(select auth.uid()) and role in ('owner','admin')) $$;
revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.is_org_admin(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

grant select,insert,update on public.organisations to authenticated;
grant all on public.organisations to service_role;
grant select,insert,update,delete on public.organisation_members to authenticated;
grant all on public.organisation_members to service_role;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
drop policy if exists org_select on public.organisations;
create policy org_select on public.organisations for select to authenticated using (owner_id=(select auth.uid()) or private.is_org_member(id));
drop policy if exists org_insert on public.organisations;
create policy org_insert on public.organisations for insert to authenticated with check (owner_id=(select auth.uid()));
drop policy if exists org_update on public.organisations;
create policy org_update on public.organisations for update to authenticated using (private.is_org_admin(id)) with check (private.is_org_admin(id));
drop policy if exists om_select on public.organisation_members;
create policy om_select on public.organisation_members for select to authenticated using (user_id=(select auth.uid()) or private.is_org_member(org_id));
drop policy if exists om_insert on public.organisation_members;
create policy om_insert on public.organisation_members for insert to authenticated with check (private.is_org_admin(org_id));
drop policy if exists om_update on public.organisation_members;
create policy om_update on public.organisation_members for update to authenticated using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id));
drop policy if exists om_delete on public.organisation_members;
create policy om_delete on public.organisation_members for delete to authenticated using (private.is_org_admin(org_id) or user_id=(select auth.uid()));

create or replace function private.add_org_owner_membership()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public
as $$ begin
  insert into public.organisation_members(org_id,user_id,role) values(new.id,new.owner_id,'owner')
  on conflict(org_id,user_id) do update set role='owner';
  return new;
end $$;
revoke all on function private.add_org_owner_membership() from public;
drop trigger if exists organisations_owner_member on public.organisations;
create trigger organisations_owner_member after insert on public.organisations for each row execute function private.add_org_owner_membership();
drop trigger if exists organisations_updated_at on public.organisations;
create trigger organisations_updated_at before update on public.organisations for each row execute function public.set_updated_at();
drop trigger if exists organisation_members_updated_at on public.organisation_members;
create trigger organisation_members_updated_at before update on public.organisation_members for each row execute function public.set_updated_at();

do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='org_id')
     and not exists(select 1 from pg_constraint where conname='profiles_org_id_fkey') then
    alter table public.profiles add constraint profiles_org_id_fkey foreign key(org_id) references public.organisations(id) on delete set null;
  end if;
end $$;

create table if not exists public.plans (
  code text primary key,
  name text not null,
  description text,
  price_pence integer not null default 0,
  currency text not null default 'GBP',
  billing_interval text not null default 'month',
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon,authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans for select to anon,authenticated using (is_active);
insert into public.plans(code,name,description,price_pence,sort_order,features,limits) values
('explorer','Explorer','Personal Blackstar workspace.',0,1,'["Personal workspace","Project repositories"]','{"agents":3,"tasks_per_month":200,"seats":1,"storage_mb":200}'),
('builder','Builder','Build and automate with Blackstar.',2000,2,'["Project repositories","Workflows","Integrations"]','{"agents":50,"tasks_per_month":5000,"seats":3,"storage_mb":5000}'),
('business','Business','Team intelligence workspace.',150000,3,'["Organisations","Project repositories","Audit"]','{"agents":500,"tasks_per_month":100000,"seats":25,"storage_mb":100000}'),
('enterprise','Enterprise','Enterprise Blackstar.',300000,4,'["Enterprise governance","Project repositories"]','{"agents":-1,"tasks_per_month":-1,"seats":-1,"storage_mb":-1}')
on conflict(code) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  status public.subscription_status not null default 'active',
  seats integer not null default 1,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions for select to authenticated using (user_id=(select auth.uid()) or private.is_org_member(org_id));

create table if not exists public.personal_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  org_id_fk uuid references public.organisations(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.personal_agents to authenticated;
grant all on public.personal_agents to service_role;
alter table public.personal_agents enable row level security;
drop policy if exists pa_select on public.personal_agents;
create policy pa_select on public.personal_agents for select to authenticated using (user_id=(select auth.uid()) or private.is_org_member(coalesce(org_id_fk,org_id)));

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  input text not null default '',
  status public.exec_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.agent_tasks to authenticated;
grant all on public.agent_tasks to service_role;
alter table public.agent_tasks enable row level security;
drop policy if exists at_select on public.agent_tasks;
create policy at_select on public.agent_tasks for select to authenticated using (user_id=(select auth.uid()) or private.is_org_member(org_id));

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.workflows to authenticated;
grant all on public.workflows to service_role;
alter table public.workflows enable row level security;
drop policy if exists wf_select on public.workflows;
create policy wf_select on public.workflows for select to authenticated using (user_id=(select auth.uid()) or private.is_org_member(org_id));

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  quantity numeric not null default 1,
  unit text not null default 'count',
  agent_id uuid references public.personal_agents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
grant select on public.usage_records to authenticated;
grant all on public.usage_records to service_role;
alter table public.usage_records enable row level security;
drop policy if exists usage_select on public.usage_records;
create policy usage_select on public.usage_records for select to authenticated using (user_id=(select auth.uid()) or private.is_org_member(org_id));

create table if not exists public.mission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  action text not null,
  target_type text,
  target_id text,
  status text not null default 'success',
  agent_id uuid,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.mission_audit_logs to authenticated;
grant all on public.mission_audit_logs to service_role;
alter table public.mission_audit_logs enable row level security;
drop policy if exists audit_select on public.mission_audit_logs;
create policy audit_select on public.mission_audit_logs for select to authenticated using (user_id=(select auth.uid()) or private.is_org_admin(org_id));
