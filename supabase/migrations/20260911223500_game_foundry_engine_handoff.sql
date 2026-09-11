-- Blackstar Game Foundry project-to-engine handoff state.

alter table public.game_foundry_projects
  add column if not exists export_manifest jsonb not null default '{}'::jsonb,
  add column if not exists handoff_status text not null default 'not_started'
    check (handoff_status in ('not_started','prepared','queued','running','completed','failed','cancelled')),
  add column if not exists handoff_id text,
  add column if not exists handoff_error text,
  add column if not exists handoff_updated_at timestamptz;

create index if not exists game_foundry_projects_handoff_idx
  on public.game_foundry_projects(user_id, handoff_status, created_at desc);
