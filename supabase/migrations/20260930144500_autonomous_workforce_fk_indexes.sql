-- Cover uncovered foreign keys on autonomous-goal, workflow-definition and workforce paths.
-- Existing leading-column indexes already cover goal/run/user/workforce relations where applicable.
create index if not exists autonomous_goal_events_run_id_idx on public.autonomous_goal_events(run_id);
create index if not exists autonomous_goal_events_user_id_idx on public.autonomous_goal_events(user_id);

create index if not exists autonomous_goal_fleet_assignments_agent_id_idx on public.autonomous_goal_fleet_assignments(agent_id) where agent_id is not null;
create index if not exists autonomous_goal_fleet_assignments_user_id_idx on public.autonomous_goal_fleet_assignments(user_id);

create index if not exists autonomous_goal_runs_workflow_id_idx on public.autonomous_goal_runs(workflow_id) where workflow_id is not null;
create index if not exists autonomous_goal_runs_workflow_run_id_idx on public.autonomous_goal_runs(workflow_run_id) where workflow_run_id is not null;
create index if not exists autonomous_goals_workforce_id_idx on public.autonomous_goals(workforce_id) where workforce_id is not null;

create index if not exists workflow_steps_agent_id_idx on public.workflow_steps(agent_id) where agent_id is not null;
create index if not exists workflow_steps_workflow_id_idx on public.workflow_steps(workflow_id);
create index if not exists workflows_workforce_id_idx on public.workflows(workforce_id) where workforce_id is not null;

create index if not exists workforce_agents_agent_id_idx on public.workforce_agents(agent_id);
create index if not exists workforces_org_id_idx on public.workforces(org_id);
create index if not exists workforces_user_id_idx on public.workforces(user_id);
