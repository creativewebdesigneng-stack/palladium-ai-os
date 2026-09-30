-- Cover the final five production advisor foreign-key gaps.
create index if not exists agent_versions_created_by_idx on public.agent_versions(created_by) where created_by is not null;
create index if not exists context_timeline_cards_workspace_id_idx on public.context_timeline_cards(workspace_id);
create index if not exists legal_research_runs_user_id_idx on public.legal_research_runs(user_id);
create index if not exists mobile_intelligence_audit_events_device_id_idx on public.mobile_intelligence_audit_events(device_id) where device_id is not null;
create index if not exists webhooks_org_id_idx on public.webhooks(org_id) where org_id is not null;
