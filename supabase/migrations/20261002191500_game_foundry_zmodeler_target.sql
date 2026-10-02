-- Add ZModeler3 as an explicit Game Foundry target.
-- Blackstar uses FBX/OBJ interchange and an optional configured bridge.
-- No native .z3d generation is claimed.

alter table public.game_foundry_projects
  drop constraint if exists game_foundry_projects_target_engine_check;

alter table public.game_foundry_projects
  add constraint game_foundry_projects_target_engine_check
  check (target_engine in ('generic','unity','unreal','godot','web','blender','zmodeler'));

alter table public.three_d_jobs
  drop constraint if exists three_d_jobs_target_engine_check;

alter table public.three_d_jobs
  add constraint three_d_jobs_target_engine_check
  check (target_engine in ('generic','unity','unreal','godot','web','blender','zmodeler'));
