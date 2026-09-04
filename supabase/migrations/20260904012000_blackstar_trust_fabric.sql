-- Blackstar Trust Fabric: canonical identity, passports and governed internal delegation.
-- Extends personal_agents; it does not create a second agent runtime.

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

create index if not exists agent_identities_owner_idx on public.agent_identities(user_id, org_id);
create index if not exists agent_identities_status_idx on public.agent_identities(status, trust_tier);

grant select, insert, update, delete on public.agent_identities to authenticated;
grant all on public.agent_identities to service_role;
alter table public.agent_identities enable row level security;

create policy agent_identities_select on public.agent_identities for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy agent_identities_insert on public.agent_identities for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access(org_id, user_id)
    and exists (
      select 1 from public.personal_agents a
      where a.id = agent_id and a.user_id = auth.uid()
        and coalesce(a.org_id_fk, a.org_id) is not distinct from org_id
    )
  );
create policy agent_identities_update on public.agent_identities for update to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (user_id = auth.uid() or public.org_admin(org_id));
create policy agent_identities_delete on public.agent_identities for delete to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id));

create trigger agent_identities_updated_at before update on public.agent_identities
  for each row execute function public.set_updated_at();

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

grant select, insert, update, delete on public.agent_passports to authenticated;
grant all on public.agent_passports to service_role;
alter table public.agent_passports enable row level security;

create or replace function public.agent_identity_is_visible(_identity uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agent_identities i
    where i.id = _identity and (i.user_id = auth.uid() or public.is_org_member(i.org_id))
  )
$$;

create or replace function public.agent_identity_is_manageable(_identity uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agent_identities i
    where i.id = _identity and (i.user_id = auth.uid() or public.org_admin(i.org_id))
  )
$$;

revoke all on function public.agent_identity_is_visible(uuid) from public;
revoke all on function public.agent_identity_is_manageable(uuid) from public;
grant execute on function public.agent_identity_is_visible(uuid) to authenticated, service_role;
grant execute on function public.agent_identity_is_manageable(uuid) to authenticated, service_role;

create policy agent_passports_select on public.agent_passports for select to authenticated
  using (public.agent_identity_is_visible(identity_id));
create policy agent_passports_write on public.agent_passports for all to authenticated
  using (public.agent_identity_is_manageable(identity_id))
  with check (public.agent_identity_is_manageable(identity_id));

create trigger agent_passports_updated_at before update on public.agent_passports
  for each row execute function public.set_updated_at();

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

create unique index if not exists agent_delegation_active_pair_idx
  on public.agent_delegation_grants(grantor_agent_id, grantee_agent_id)
  where status = 'active';
create index if not exists agent_delegation_grantee_idx
  on public.agent_delegation_grants(grantee_agent_id, status, expires_at);

grant select, insert, update, delete on public.agent_delegation_grants to authenticated;
grant all on public.agent_delegation_grants to service_role;
alter table public.agent_delegation_grants enable row level security;

create policy agent_delegation_select on public.agent_delegation_grants for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy agent_delegation_write on public.agent_delegation_grants for all to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (
    created_by = auth.uid()
    and (user_id = auth.uid() or public.org_admin(org_id))
    and exists (
      select 1 from public.personal_agents a
      where a.id = grantor_agent_id
        and (a.user_id = auth.uid() or public.org_admin(coalesce(a.org_id_fk, a.org_id)))
    )
    and exists (
      select 1 from public.personal_agents a
      where a.id = grantee_agent_id
        and (a.user_id = auth.uid() or public.is_org_member(coalesce(a.org_id_fk, a.org_id)))
    )
  );

create trigger agent_delegation_grants_updated_at before update on public.agent_delegation_grants
  for each row execute function public.set_updated_at();

-- Service-role helper for runtime enforcement. This returns only active, unexpired grants;
-- it never bypasses the existing workflow/tool approval layer.
create or replace function public.resolve_agent_delegation(
  _grantor uuid,
  _grantee uuid,
  _scope text default null
) returns table (
  grant_id uuid,
  max_hops integer,
  requires_approval boolean,
  allow_external_actions boolean,
  scopes jsonb
) language sql stable security definer set search_path = public as $$
  select g.id, g.max_hops, g.requires_approval, g.allow_external_actions, g.scopes
  from public.agent_delegation_grants g
  where g.grantor_agent_id = _grantor
    and g.grantee_agent_id = _grantee
    and g.status = 'active'
    and (g.expires_at is null or g.expires_at > now())
    and (_scope is null or g.scopes ? _scope)
    and (
      g.user_id = auth.uid()
      or public.is_org_member(g.org_id)
      or auth.role() = 'service_role'
    )
  order by g.created_at desc
  limit 1
$$;

revoke all on function public.resolve_agent_delegation(uuid, uuid, text) from public;
grant execute on function public.resolve_agent_delegation(uuid, uuid, text) to authenticated, service_role;

-- Backfill canonical identities and passports for existing agents. Private signing keys are never stored here.
insert into public.agent_identities (agent_id, user_id, org_id, canonical_id, status, issuer)
select a.id, a.user_id, coalesce(a.org_id_fk, a.org_id), 'urn:blackstar:agent:' || a.id::text,
       case when a.status = 'archived' then 'revoked' else 'active' end,
       'blackstar'
from public.personal_agents a
where a.user_id is not null
on conflict (agent_id) do nothing;

insert into public.agent_passports (identity_id, display_name, description)
select i.id, a.name, a.description
from public.agent_identities i
join public.personal_agents a on a.id = i.agent_id
on conflict (identity_id) do nothing;
