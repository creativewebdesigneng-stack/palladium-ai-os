-- Reconcile Blackstar's existing agent Tool Registry, scoped overrides and audit
-- ledger. Do not grant tools by migration: no agent.allowed_tools is changed.
-- The runtime also requires a matching active catalogue row before granting.
create table if not exists public.tools (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 name text not null,
 category text not null default 'general',
 description text,
 kind text not null default 'builtin',
 requires_approval boolean not null default true,
 risk_level text not null default 'medium' check(risk_level in ('low','medium','high')),
 config_schema jsonb not null default '{}'::jsonb,
 min_plan text,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tools enable row level security;
revoke all on public.tools from public,anon,authenticated;
grant select on public.tools to authenticated;
grant all on public.tools to service_role;
drop policy if exists tools_active_read on public.tools;
create policy tools_active_read on public.tools for select to authenticated using(is_active=true);

create table if not exists public.tool_permissions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 org_id uuid references public.organisations(id) on delete cascade,
 agent_id uuid references public.personal_agents(id) on delete cascade,
 tool text not null,
 enabled boolean not null default true,
 requires_approval boolean not null default true,
 allowed_domains text[] not null default '{}'::text[],
 spend_cap numeric(12,2),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(agent_id,tool),
 constraint tool_permissions_spend_cap_positive check(spend_cap is null or spend_cap>=0)
);
create index if not exists tool_permissions_user_idx on public.tool_permissions(user_id,tool);
create index if not exists tool_permissions_agent_idx on public.tool_permissions(agent_id,tool);
alter table public.tool_permissions enable row level security;
revoke all on public.tool_permissions from public,anon,authenticated;
grant select,insert,update,delete on public.tool_permissions to authenticated;
grant all on public.tool_permissions to service_role;
drop policy if exists tool_permissions_owner_select on public.tool_permissions;
create policy tool_permissions_owner_select on public.tool_permissions for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists tool_permissions_owner_insert on public.tool_permissions;
create policy tool_permissions_owner_insert on public.tool_permissions for insert to authenticated
 with check(user_id=(select auth.uid()) and
  (org_id is null or private.is_org_member(org_id)) and
  (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
drop policy if exists tool_permissions_owner_update on public.tool_permissions;
create policy tool_permissions_owner_update on public.tool_permissions for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()) and
  (org_id is null or private.is_org_member(org_id)) and
  (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid()))));
drop policy if exists tool_permissions_owner_delete on public.tool_permissions;
create policy tool_permissions_owner_delete on public.tool_permissions for delete to authenticated
 using(user_id=(select auth.uid()));

create table if not exists public.tool_executions (
 id uuid primary key default gen_random_uuid(),
 org_id uuid references public.organisations(id) on delete set null,
 user_id uuid not null references auth.users(id) on delete cascade,
 agent_id uuid references public.personal_agents(id) on delete set null,
 agent_task_id uuid references public.agent_tasks(id) on delete set null,
 tool text not null,
 input jsonb not null default '{}'::jsonb,
 output jsonb,
 status public.exec_status not null default 'pending',
 error text,
 policy_code text,
 duration_ms integer,
 created_at timestamptz not null default now()
);
create index if not exists tool_executions_user_created_idx on public.tool_executions(user_id,created_at desc);
create index if not exists tool_executions_task_created_idx on public.tool_executions(agent_task_id,created_at desc);
alter table public.tool_executions enable row level security;
revoke all on public.tool_executions from public,anon,authenticated;
grant select,insert on public.tool_executions to authenticated;
grant all on public.tool_executions to service_role;
drop policy if exists tool_executions_owner_select on public.tool_executions;
create policy tool_executions_owner_select on public.tool_executions for select to authenticated
 using(user_id=(select auth.uid()));
drop policy if exists tool_executions_owner_insert on public.tool_executions;
create policy tool_executions_owner_insert on public.tool_executions for insert to authenticated
 with check(user_id=(select auth.uid())
  and (org_id is null or private.is_org_member(org_id))
  and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=agent_id and a.user_id=(select auth.uid())))
  and (agent_task_id is null or exists(select 1 from public.agent_tasks t where t.id=agent_task_id and t.user_id=(select auth.uid()))));

-- Only confirmed executable registry slugs are seeded. No agent receives a
-- grant from these rows: allowed_tools, RLS, plan and approval still govern.
insert into public.tools(slug,name,category,kind,requires_approval,risk_level,is_active)
select s.slug,initcap(replace(s.slug,'_',' ')),'agent_runtime','builtin',true,'medium',true
from unnest(array[
 'current_time','calculator','web_search','web_fetch','memory_search',
 'memory_write','request_approval','browser','http_request','connected_service',
 'integration_capabilities','integration_action','nango_capabilities','nango_action',
 'connected_service_write','github_write','file_analysis','data_analysis','calendar',
 'email_draft','email_send','slack_post','shopping_search','prepare_purchase',
 'database_query','code_exec','skill_script','social_ops','html_studio',
 'agent_workspace','seo_ops','app_studio','voxel_studio','three_d_studio',
 'game_foundry','cinema_studio','short_video','astra_vision',
 'astra_async_workflow','astra_orchestrate','browser_task'
]) as s(slug)
on conflict(slug) do nothing;
notify pgrst,'reload schema';
