-- Cover uncovered foreign keys on the core agent runtime, messaging and approval paths.
-- Existing composite indexes already cover user/run/agent/org relations where applicable.
create index if not exists agent_activities_agent_id_idx on public.agent_activities(agent_id) where agent_id is not null;
create index if not exists agent_activities_org_id_idx on public.agent_activities(org_id) where org_id is not null;
create index if not exists agent_activities_task_id_idx on public.agent_activities(task_id) where task_id is not null;

create index if not exists agent_messages_from_step_run_id_idx on public.agent_messages(from_step_run_id) where from_step_run_id is not null;
create index if not exists agent_messages_to_step_id_idx on public.agent_messages(to_step_id) where to_step_id is not null;
create index if not exists agent_messages_from_agent_id_idx on public.agent_messages(from_agent_id) where from_agent_id is not null;
create index if not exists agent_messages_to_agent_id_idx on public.agent_messages(to_agent_id) where to_agent_id is not null;
create index if not exists agent_messages_org_id_idx on public.agent_messages(org_id) where org_id is not null;
create index if not exists agent_messages_user_id_idx on public.agent_messages(user_id);

create index if not exists agent_skill_script_executions_skill_id_idx on public.agent_skill_script_executions(skill_id);
create index if not exists agent_tasks_task_id_idx on public.agent_tasks(task_id) where task_id is not null;

create index if not exists approval_requests_decided_by_idx on public.approval_requests(decided_by) where decided_by is not null;
create index if not exists approval_requests_org_id_idx on public.approval_requests(org_id) where org_id is not null;
create index if not exists approval_requests_task_id_idx on public.approval_requests(task_id) where task_id is not null;
