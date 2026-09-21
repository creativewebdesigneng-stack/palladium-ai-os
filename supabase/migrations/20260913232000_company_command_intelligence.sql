alter table public.company_workspaces
  add column if not exists kpis jsonb not null default '[]'::jsonb,
  add column if not exists decisions jsonb not null default '[]'::jsonb,
  add column if not exists leadership_cadence jsonb not null default '{}'::jsonb,
  add column if not exists opportunities jsonb not null default '[]'::jsonb;
