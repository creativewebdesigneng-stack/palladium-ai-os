-- Blackstar Game Foundry structured gameplay/world content compiler.
alter table public.game_foundry_projects
  add column if not exists content_manifest jsonb not null default '{}'::jsonb,
  add column if not exists content_status text not null default 'not_started'
    check (content_status in ('not_started','generating','generated','failed')),
  add column if not exists content_error text,
  add column if not exists content_generated_at timestamptz;
