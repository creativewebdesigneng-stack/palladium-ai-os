-- Blackstar Game Foundry portable project package.
-- Keeps package state on the existing project instead of introducing another package store.

alter table public.game_foundry_projects
  add column if not exists package_manifest jsonb not null default '{}'::jsonb,
  add column if not exists package_status text not null default 'not_started'
    check (package_status in ('not_started','prepared','failed')),
  add column if not exists package_error text,
  add column if not exists package_prepared_at timestamptz;
