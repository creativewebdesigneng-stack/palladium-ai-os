-- Blackstar Game Foundry AI design planning stage.
alter table public.game_foundry_projects drop constraint if exists game_foundry_projects_status_check;
alter table public.game_foundry_projects
  add constraint game_foundry_projects_status_check
  check (status in ('draft','planning','planned','queued','running','completed','failed','cancelled'));
