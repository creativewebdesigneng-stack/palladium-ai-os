-- Follow-up for the 25 composite construction FKs reported without covering indexes
-- by the live Supabase Performance Advisor after construction_relational_owner_scope.
-- This migration is additive; no data, constraints, RLS policies or grants change.

create index if not exists c_construction_composite_idx_002 on public.construction_agent_actions (workspace_id, user_id);
create index if not exists c_construction_composite_idx_004 on public.construction_agent_runs (workspace_id, user_id);
create index if not exists c_construction_composite_idx_005 on public.construction_asset_health (asset_id, workspace_id, user_id);
create index if not exists c_construction_composite_idx_006 on public.construction_asset_health (workspace_id, user_id);
create index if not exists c_construction_composite_idx_007 on public.construction_asset_telemetry (asset_id, workspace_id, user_id);
create index if not exists c_construction_composite_idx_008 on public.construction_asset_telemetry (workspace_id, user_id);
create index if not exists c_construction_composite_idx_010 on public.construction_assets (workspace_id, user_id);
create index if not exists c_construction_composite_idx_012 on public.construction_changes (workspace_id, user_id);
create index if not exists c_construction_composite_idx_014 on public.construction_documents (workspace_id, user_id);
create index if not exists c_construction_composite_idx_016 on public.construction_estimate_items (workspace_id, user_id);
create index if not exists c_construction_composite_idx_018 on public.construction_field_records (workspace_id, user_id);
create index if not exists c_construction_composite_idx_021 on public.construction_inspection_actions (workspace_id, user_id);
create index if not exists c_construction_composite_idx_024 on public.construction_inspections (workspace_id, user_id);
create index if not exists c_construction_composite_idx_027 on public.construction_issues (workspace_id, user_id);
create index if not exists c_construction_composite_idx_029 on public.construction_maintenance (workspace_id, user_id);
create index if not exists c_construction_composite_idx_032 on public.construction_materials (workspace_id, user_id);
create index if not exists c_construction_composite_idx_033 on public.construction_partners (workspace_id, user_id);
create index if not exists c_construction_composite_idx_036 on public.construction_progress_evidence (workspace_id, user_id);
create index if not exists c_construction_composite_idx_037 on public.construction_projects (workspace_id, user_id);
create index if not exists c_construction_composite_idx_039 on public.construction_reliability_events (workspace_id, user_id);
create index if not exists c_construction_composite_idx_041 on public.construction_reports (workspace_id, user_id);
create index if not exists c_construction_composite_idx_044 on public.construction_schedule_tasks (workspace_id, user_id);
create index if not exists c_construction_composite_idx_046 on public.construction_tenders (workspace_id, user_id);
create index if not exists c_construction_composite_idx_049 on public.construction_work_packages (workspace_id, user_id);
create index if not exists c_construction_composite_idx_052 on public.construction_workforce (workspace_id, user_id);
