-- Agent Specification v2
-- Additive and backwards-compatible: existing agents remain spec_version = 1
-- until a v2 operating profile is explicitly saved.

alter table public.personal_agents
  add column if not exists spec_version integer not null default 1,
  add column if not exists operating_profile jsonb not null default '{}'::jsonb;

comment on column public.personal_agents.spec_version is
  'Version of the durable PalladiumAI agent operating specification.';
comment on column public.personal_agents.operating_profile is
  'Versioned role/objective/responsibility/success/KPI/delegation/verification contract for the agent runtime.';

create index if not exists personal_agents_operating_profile_gin
  on public.personal_agents using gin (operating_profile);
