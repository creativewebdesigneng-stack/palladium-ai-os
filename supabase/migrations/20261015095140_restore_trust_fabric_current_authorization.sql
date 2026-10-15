-- Restore the existing Trust Fabric schema with current authorization contracts.
-- No retired public auth helper, privileged public RPC, delegation backfill,
-- signing key, capability grant or tool permission is introduced.

do $$ begin
  if to_regclass('public.agent_identities') is not null
    or to_regclass('public.agent_passports') is not null
    or to_regclass('public.agent_delegation_grants') is not null
    or to_regclass('public.agent_a2a_messages') is not null then
    raise exception 'Trust Fabric recovery requires all four reviewed tables to be absent; inspect existing state before proceeding.';
  end if;
end $$;

create table if not exists public.agent_identities (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.personal_agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  canonical_id text not null unique,
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  trust_tier text not null default 'standard' check (trust_tier in ('restricted','standard','verified','privileged')),
  public_key_fingerprint text,
  issuer text not null default 'blackstar',
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (canonical_id ~ '^urn:blackstar:agent:[0-9a-fA-F-]{36}$')
);
alter table public.agent_identities enable row level security;
revoke all on table public.agent_identities from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_identities to authenticated;
grant all on table public.agent_identities to service_role;

create table if not exists public.agent_passports (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null unique references public.agent_identities(id) on delete cascade,
  display_name text,
  description text,
  capabilities jsonb not null default '[]'::jsonb,
  provider_scopes jsonb not null default '[]'::jsonb,
  tool_scopes jsonb not null default '[]'::jsonb,
  autonomy_tier text not null default 'guarded' check (autonomy_tier in ('assisted','guarded','autonomous')),
  risk_tier text not null default 'medium' check (risk_tier in ('low','medium','high','critical')),
  attestations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.agent_passports enable row level security;
revoke all on table public.agent_passports from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_passports to authenticated;
grant all on table public.agent_passports to service_role;

create table if not exists public.agent_delegation_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  grantor_agent_id uuid not null references public.personal_agents(id) on delete cascade,
  grantee_agent_id uuid not null references public.personal_agents(id) on delete cascade,
  scopes jsonb not null default '[]'::jsonb,
  max_hops integer not null default 1 check (max_hops between 0 and 4),
  requires_approval boolean not null default true,
  allow_external_actions boolean not null default false,
  status text not null default 'active' check (status in ('active','suspended','revoked','expired')),
  expires_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grantor_agent_id <> grantee_agent_id)
);
alter table public.agent_delegation_grants enable row level security;
revoke all on table public.agent_delegation_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_delegation_grants to authenticated;
grant all on table public.agent_delegation_grants to service_role;

create table if not exists public.agent_a2a_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid null,
  sender_agent_id uuid not null,
  recipient_agent_id uuid not null,
  delegation_grant_id uuid null,
  correlation_id uuid null,
  scope text not null check (length(scope) between 1 and 120),
  kind text not null default 'request' check (kind in ('request','response','event')),
  payload jsonb not null default '{}'::jsonb,
  hop integer not null default 0 check (hop between 0 and 4),
  status text not null default 'queued' check (status in ('queued','pending_approval','delivered','consumed','rejected','expired')),
  requires_approval boolean not null default false,
  expires_at timestamptz null,
  delivered_at timestamptz null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_a2a_distinct_agents check (sender_agent_id <> recipient_agent_id)
);
alter table public.agent_a2a_messages enable row level security;
revoke all on table public.agent_a2a_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_a2a_messages to authenticated;
grant all on table public.agent_a2a_messages to service_role;

create index if not exists agent_identities_owner_idx on public.agent_identities(user_id, org_id);
create index if not exists agent_identities_status_idx on public.agent_identities(status, trust_tier);
create unique index if not exists agent_delegation_active_pair_idx on public.agent_delegation_grants(grantor_agent_id,grantee_agent_id) where status='active';
create index if not exists agent_delegation_grantee_idx on public.agent_delegation_grants(grantee_agent_id,status,expires_at);
create index if not exists agent_a2a_messages_user_created_idx on public.agent_a2a_messages(user_id,created_at desc);
create index if not exists agent_a2a_messages_recipient_status_idx on public.agent_a2a_messages(recipient_agent_id,status,created_at);
create index if not exists agent_a2a_messages_correlation_idx on public.agent_a2a_messages(correlation_id) where correlation_id is not null;

create policy trust_identity_read on public.agent_identities for select to authenticated
  using(user_id=(select auth.uid()));
create policy trust_identity_insert on public.agent_identities for insert to authenticated with check(user_id=(select auth.uid())
  and trust_tier in ('restricted','standard') and issuer='blackstar'
  and canonical_id='urn:blackstar:agent:' || agent_id::text
  and (org_id is null or private.is_org_member(org_id))
  and exists(select 1 from public.personal_agents a where a.id=agent_identities.agent_id
    and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_identities.org_id));
create policy trust_identity_update on public.agent_identities for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid())
  and trust_tier in ('restricted','standard') and issuer='blackstar'
  and canonical_id='urn:blackstar:agent:' || agent_id::text
  and (org_id is null or private.is_org_member(org_id))
  and exists(select 1 from public.personal_agents a where a.id=agent_identities.agent_id
    and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_identities.org_id));
create policy trust_identity_delete on public.agent_identities for delete to authenticated using(user_id=(select auth.uid()));

create policy trust_passport_read on public.agent_passports for select to authenticated
  using(exists(select 1 from public.agent_identities i where i.id=agent_passports.identity_id));
create policy trust_passport_insert on public.agent_passports for insert to authenticated with check(exists(select 1 from public.agent_identities i where i.id=agent_passports.identity_id and i.user_id=(select auth.uid())));
create policy trust_passport_update on public.agent_passports for update to authenticated using(exists(select 1 from public.agent_identities i where i.id=agent_passports.identity_id and i.user_id=(select auth.uid()))) with check(exists(select 1 from public.agent_identities i where i.id=agent_passports.identity_id and i.user_id=(select auth.uid())));
create policy trust_passport_delete on public.agent_passports for delete to authenticated using(exists(select 1 from public.agent_identities i where i.id=agent_passports.identity_id and i.user_id=(select auth.uid())));

create policy trust_delegation_read on public.agent_delegation_grants for select to authenticated
  using(user_id=(select auth.uid()));
create policy trust_delegation_insert on public.agent_delegation_grants for insert to authenticated with check(user_id=(select auth.uid()) and created_by=(select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and exists(select 1 from public.personal_agents a where a.id=agent_delegation_grants.grantor_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_delegation_grants.org_id)
  and exists(select 1 from public.personal_agents a where a.id=agent_delegation_grants.grantee_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_delegation_grants.org_id));
create policy trust_delegation_update on public.agent_delegation_grants for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and created_by=(select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and exists(select 1 from public.personal_agents a where a.id=agent_delegation_grants.grantor_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_delegation_grants.org_id)
  and exists(select 1 from public.personal_agents a where a.id=agent_delegation_grants.grantee_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_delegation_grants.org_id));
create policy trust_delegation_delete on public.agent_delegation_grants for delete to authenticated using(user_id=(select auth.uid()));

-- A2A retains the existing message-envelope contract; it never executes a tool.
revoke delete on public.agent_a2a_messages from authenticated;
create policy trust_a2a_read on public.agent_a2a_messages for select to authenticated using(user_id=(select auth.uid()));
create policy trust_a2a_insert on public.agent_a2a_messages for insert to authenticated with check(user_id=(select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and exists(select 1 from public.personal_agents a where a.id=agent_a2a_messages.sender_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_a2a_messages.org_id)
  and exists(select 1 from public.personal_agents a where a.id=agent_a2a_messages.recipient_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_a2a_messages.org_id));
create policy trust_a2a_update on public.agent_a2a_messages for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and exists(select 1 from public.personal_agents a where a.id=agent_a2a_messages.sender_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_a2a_messages.org_id)
  and exists(select 1 from public.personal_agents a where a.id=agent_a2a_messages.recipient_agent_id and a.user_id=(select auth.uid())
    and coalesce(a.org_id_fk,a.org_id) is not distinct from agent_a2a_messages.org_id));

-- Preserve the existing RPC contract while enforcing the caller's own scope
-- through SECURITY INVOKER and the current RLS policies.
create or replace function public.resolve_agent_delegation(_grantor uuid,_grantee uuid,_scope text default null)
returns table(grant_id uuid,max_hops integer,requires_approval boolean,allow_external_actions boolean,scopes jsonb)
language sql stable security invoker set search_path='' as $$
  select g.id,g.max_hops,g.requires_approval,g.allow_external_actions,g.scopes
  from public.agent_delegation_grants g
  where g.user_id=(select auth.uid()) and g.grantor_agent_id=_grantor and g.grantee_agent_id=_grantee
    and g.status='active' and (g.expires_at is null or g.expires_at>now())
    and (_scope is null or g.scopes ? _scope or g.scopes ? '*')
  order by g.created_at desc limit 1
$$;
revoke all on function public.resolve_agent_delegation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.resolve_agent_delegation(uuid,uuid,text) to authenticated,service_role;

create trigger agent_identities_updated_at before update on public.agent_identities for each row execute function public.set_updated_at();
create trigger agent_passports_updated_at before update on public.agent_passports for each row execute function public.set_updated_at();
create trigger agent_delegation_grants_updated_at before update on public.agent_delegation_grants for each row execute function public.set_updated_at();
-- Backfill canonical identities and passports for existing agents. Private signing keys are never stored here.
insert into public.agent_identities (agent_id, user_id, org_id, canonical_id, status, issuer)
select a.id, a.user_id, coalesce(a.org_id_fk, a.org_id), 'urn:blackstar:agent:' || a.id::text,
       case when a.status = 'archived' then 'revoked' else 'active' end,
       'blackstar'
from public.personal_agents a
where a.user_id is not null
on conflict (agent_id) do nothing;

insert into public.agent_passports (identity_id, display_name, description)
select i.id, a.name, a.purpose
from public.agent_identities i
join public.personal_agents a on a.id = i.agent_id
on conflict (identity_id) do nothing;

notify pgrst, 'reload schema';
