-- Preserve owner predicates while evaluating the stable caller once per query.
alter policy external_mcp_servers_select_own on public.external_mcp_servers
  using(user_id=(select auth.uid()));
alter policy external_mcp_servers_insert_own on public.external_mcp_servers
  with check(user_id=(select auth.uid()));
alter policy external_mcp_servers_update_own on public.external_mcp_servers
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter policy external_mcp_servers_delete_own on public.external_mcp_servers
  using(user_id=(select auth.uid()));

create index if not exists agent_delegation_grants_created_by_idx on public.agent_delegation_grants(created_by);
create index if not exists agent_delegation_grants_org_idx on public.agent_delegation_grants(org_id);
create index if not exists agent_delegation_grants_owner_idx on public.agent_delegation_grants(user_id);
create index if not exists agent_identities_org_idx on public.agent_identities(org_id);

-- Only remove the redundant standalone index if the original UNIQUE constraint
-- still provides the exact owner/slug uniqueness contract.
do $$ begin
  if not exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid=c.conrelid and a.attname='user_id'
    join pg_attribute b on b.attrelid=c.conrelid and b.attname='slug'
    where c.conrelid='public.external_mcp_servers'::regclass
      and c.conname='external_mcp_servers_user_id_slug_key' and c.contype='u'
      and c.conkey=array[a.attnum,b.attnum]::smallint[]
  ) then raise exception 'Expected MCP owner/slug unique constraint is absent; inspect indexes before proceeding.';
  end if;
end $$;
drop index if exists public.external_mcp_servers_user_slug_uidx;
notify pgrst,'reload schema';
