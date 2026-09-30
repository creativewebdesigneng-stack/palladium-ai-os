-- Cover remaining uncovered foreign keys on workflow execution, tool governance,
-- personal task and legacy personal-memory paths. Existing leading-column indexes
-- already cover workflow_step_runs.run_id, tool_executions.agent_task_id/user_id,
-- tool_permissions.agent_id/user_id, and personal task/memory user_id.
create index if not exists personal_memories_agent_id_idx on public.personal_memories(agent_id) where agent_id is not null;
create index if not exists personal_memories_org_id_idx on public.personal_memories(org_id) where org_id is not null;
create index if not exists personal_tasks_agent_id_idx on public.personal_tasks(agent_id) where agent_id is not null;
create index if not exists personal_tasks_org_id_idx on public.personal_tasks(org_id) where org_id is not null;

create index if not exists tool_executions_agent_id_idx on public.tool_executions(agent_id) where agent_id is not null;
create index if not exists tool_executions_org_id_idx on public.tool_executions(org_id) where org_id is not null;
create index if not exists tool_permissions_org_id_idx on public.tool_permissions(org_id) where org_id is not null;

create index if not exists workflow_runs_workflow_id_idx on public.workflow_runs(workflow_id);
create index if not exists workflow_runs_workforce_id_idx on public.workflow_runs(workforce_id) where workforce_id is not null;
create index if not exists workflow_runs_org_id_idx on public.workflow_runs(org_id);
create index if not exists workflow_runs_user_id_idx on public.workflow_runs(user_id);

create index if not exists workflow_step_runs_workflow_id_idx on public.workflow_step_runs(workflow_id);
create index if not exists workflow_step_runs_step_id_idx on public.workflow_step_runs(step_id) where step_id is not null;
create index if not exists workflow_step_runs_agent_id_idx on public.workflow_step_runs(agent_id) where agent_id is not null;
create index if not exists workflow_step_runs_task_id_idx on public.workflow_step_runs(task_id) where task_id is not null;
create index if not exists workflow_step_runs_org_id_idx on public.workflow_step_runs(org_id);
create index if not exists workflow_step_runs_user_id_idx on public.workflow_step_runs(user_id);
