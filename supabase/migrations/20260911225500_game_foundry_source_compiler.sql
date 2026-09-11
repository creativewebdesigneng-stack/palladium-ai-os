-- Blackstar Game Foundry bounded engine source generation.
-- Reuses the existing Builder source-manifest generator rather than adding a second code generator.

alter table public.game_foundry_projects
  add column if not exists source_manifest jsonb not null default '{}'::jsonb,
  add column if not exists source_status text not null default 'not_started'
    check (source_status in ('not_started','generating','generated','failed')),
  add column if not exists source_error text,
  add column if not exists source_generated_at timestamptz;
