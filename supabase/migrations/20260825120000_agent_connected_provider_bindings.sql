-- Per-agent connected-provider allow-list. OAuth credentials remain user-owned;
-- agents receive only the provider identifiers explicitly assigned to them.
alter table public.personal_agents
  add column if not exists allowed_providers text[] not null default '{}';

-- Preserve existing connected-service agents by binding the providers that are
-- already connected for their owner. Future connections are not inherited
-- automatically, so access remains least-privilege after this migration.
update public.personal_agents as agent
set allowed_providers = providers.items
from (
  select
    normalized.user_id,
    array_agg(normalized.provider order by normalized.provider) as items
  from (
    select distinct
      integration.user_id,
      case
        when integration.provider like 'nango\_%' escape '\'
          then substring(integration.provider from 7)
        else integration.provider
      end as provider
    from public.integrations as integration
    where integration.status = 'connected'
  ) as normalized
  group by normalized.user_id
) as providers
where providers.user_id = agent.user_id
  and 'connected_service' = any(agent.allowed_tools)
  and cardinality(agent.allowed_providers) = 0;

create index if not exists personal_agents_allowed_providers_gin
  on public.personal_agents using gin (allowed_providers);
