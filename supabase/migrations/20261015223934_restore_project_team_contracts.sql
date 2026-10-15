-- Restore existing project work and organisation-team contracts through current private authorizers.
do $$ begin if to_regclass('public.project_cycles') is not null or to_regclass('public.project_modules') is not null or to_regclass('public.project_work_items') is not null or to_regclass('public.teams') is not null or to_regclass('public.team_members') is not null or exists(select 1 from information_schema.columns where table_schema='public' and table_name='personal_agents' and column_name='team_id') then raise exception 'Project/team recovery requires all five tables and agent team link absent; review partial state first.'; end if;end $$;

create table public.project_cycles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  goal text,
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.project_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  status text not null default 'planned' check (status in ('backlog','planned','in_progress','completed','cancelled')),
  target_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_work_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cycle_id uuid,
  module_id uuid,
  parent_id uuid,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text,
  status text not null default 'backlog' check (status in ('backlog','todo','in_progress','in_review','done','cancelled')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  estimate numeric(8,2) check (estimate is null or estimate >= 0),
  assignee_type text not null default 'unassigned' check (assignee_type in ('unassigned','human','agent')),
  assignee_id uuid,
  sort_order numeric(20,6) not null default 0,
  starts_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  labels text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or starts_at is null or due_at >= starts_at),
  check ((assignee_type = 'unassigned' and assignee_id is null) or assignee_type <> 'unassigned')
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  goal text,
  lead_agent_id uuid references public.personal_agents(id) on delete set null,
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  unique(id,org_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);
alter table public.project_cycles add constraint project_cycles_project_identity unique(id,project_id);
alter table public.project_modules add constraint project_modules_project_identity unique(id,project_id);
alter table public.project_work_items add constraint project_work_items_project_identity unique(id,project_id);
alter table public.project_work_items add constraint work_item_cycle_id_project_fk foreign key(cycle_id,project_id) references public.project_cycles(id,project_id) on delete set null(cycle_id);
alter table public.project_work_items add constraint work_item_module_id_project_fk foreign key(module_id,project_id) references public.project_modules(id,project_id) on delete set null(module_id);
alter table public.project_work_items add constraint work_item_parent_id_project_fk foreign key(parent_id,project_id) references public.project_work_items(id,project_id) on delete set null(parent_id);
alter table public.project_work_items add constraint work_item_not_self check (parent_id is distinct from id);
alter table public.personal_agents add column team_id uuid;
alter table public.personal_agents add constraint personal_agents_team_org_fk foreign key(team_id,org_id) references public.teams(id,org_id) on delete set null(team_id);
alter table public.personal_agents add constraint personal_agents_team_needs_org check (team_id is null or org_id is not null);
create index personal_agents_team_org_idx on public.personal_agents(team_id,org_id);
create index project_cycles_recovery_0_idx on public.project_cycles(project_id,status,starts_at);
create index project_cycles_recovery_1_idx on public.project_cycles(created_by);
create index project_modules_recovery_0_idx on public.project_modules(project_id,status,target_at);
create index project_modules_recovery_1_idx on public.project_modules(created_by);
create index project_work_items_recovery_0_idx on public.project_work_items(project_id,status,sort_order,created_at);
create index project_work_items_recovery_1_idx on public.project_work_items(created_by);
create index project_work_items_recovery_2_idx on public.project_work_items(cycle_id,project_id);
create index project_work_items_recovery_3_idx on public.project_work_items(module_id,project_id);
create index project_work_items_recovery_4_idx on public.project_work_items(parent_id,project_id);
create index teams_recovery_0_idx on public.teams(org_id);
create index teams_recovery_1_idx on public.teams(created_by);
create index teams_recovery_2_idx on public.teams(lead_agent_id);
create index team_members_recovery_0_idx on public.team_members(user_id);
create trigger project_cycles_recovery_updated before update on public.project_cycles for each row execute function public.set_updated_at();
create trigger project_modules_recovery_updated before update on public.project_modules for each row execute function public.set_updated_at();
create trigger project_work_items_recovery_updated before update on public.project_work_items for each row execute function public.set_updated_at();
create trigger teams_recovery_updated before update on public.teams for each row execute function public.set_updated_at();

alter table public.project_cycles enable row level security;
revoke all on public.project_cycles from anon,authenticated;
grant select,insert,delete on public.project_cycles to authenticated;
grant all on public.project_cycles to service_role;
grant update(name,goal,status,starts_at,ends_at,metadata,updated_at) on public.project_cycles to authenticated;
create policy project_cycles_recovery_select on public.project_cycles for select to authenticated using (exists(select 1 from public.projects p where p.id=project_cycles.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))));
create policy project_cycles_recovery_insert on public.project_cycles for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_cycles.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));
create policy project_cycles_recovery_update on public.project_cycles for update to authenticated using (exists(select 1 from public.projects p where p.id=project_cycles.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id)) with check (exists(select 1 from public.projects p where p.id=project_cycles.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));
create policy project_cycles_recovery_delete on public.project_cycles for delete to authenticated using (exists(select 1 from public.projects p where p.id=project_cycles.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));

alter table public.project_modules enable row level security;
revoke all on public.project_modules from anon,authenticated;
grant select,insert,delete on public.project_modules to authenticated;
grant all on public.project_modules to service_role;
grant update(name,description,status,target_at,metadata,updated_at) on public.project_modules to authenticated;
create policy project_modules_recovery_select on public.project_modules for select to authenticated using (exists(select 1 from public.projects p where p.id=project_modules.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))));
create policy project_modules_recovery_insert on public.project_modules for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_modules.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));
create policy project_modules_recovery_update on public.project_modules for update to authenticated using (exists(select 1 from public.projects p where p.id=project_modules.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id)) with check (exists(select 1 from public.projects p where p.id=project_modules.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));
create policy project_modules_recovery_delete on public.project_modules for delete to authenticated using (exists(select 1 from public.projects p where p.id=project_modules.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));

alter table public.project_work_items enable row level security;
revoke all on public.project_work_items from anon,authenticated;
grant select,insert,delete on public.project_work_items to authenticated;
grant all on public.project_work_items to service_role;
grant update(cycle_id,module_id,parent_id,title,description,status,priority,estimate,assignee_type,assignee_id,sort_order,starts_at,due_at,completed_at,labels,metadata,updated_at) on public.project_work_items to authenticated;
create policy project_work_items_recovery_select on public.project_work_items for select to authenticated using (exists(select 1 from public.projects p where p.id=project_work_items.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))));
create policy project_work_items_recovery_insert on public.project_work_items for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_work_items.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));
create policy project_work_items_recovery_update on public.project_work_items for update to authenticated using (exists(select 1 from public.projects p where p.id=project_work_items.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id)) with check (exists(select 1 from public.projects p where p.id=project_work_items.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));
create policy project_work_items_recovery_delete on public.project_work_items for delete to authenticated using (exists(select 1 from public.projects p where p.id=project_work_items.project_id and ((p.org_id is null and p.user_id=(select auth.uid())) or (p.org_id is not null and private.is_org_member(p.org_id)))) and private.can_write_project(project_id));

alter table public.teams enable row level security;
revoke all on public.teams from anon,authenticated;
grant select,insert,delete on public.teams to authenticated;
grant all on public.teams to service_role;
grant update on public.teams to authenticated;
create policy teams_recovery_select on public.teams for select to authenticated using (private.is_org_member(org_id));
create policy teams_recovery_insert on public.teams for insert to authenticated with check (private.is_org_admin(org_id) and (lead_agent_id is null or exists(select 1 from public.personal_agents a where a.id=lead_agent_id and a.org_id=teams.org_id)));
create policy teams_recovery_update on public.teams for update to authenticated using (private.is_org_admin(org_id)) with check (private.is_org_admin(org_id) and (lead_agent_id is null or exists(select 1 from public.personal_agents a where a.id=lead_agent_id and a.org_id=teams.org_id)));
create policy teams_recovery_delete on public.teams for delete to authenticated using (private.is_org_admin(org_id));

alter table public.team_members enable row level security;
revoke all on public.team_members from anon,authenticated;
grant select,insert,delete on public.team_members to authenticated;
grant all on public.team_members to service_role;
grant update on public.team_members to authenticated;
create policy team_members_recovery_select on public.team_members for select to authenticated using (exists(select 1 from public.teams t where t.id=team_id and private.is_org_member(t.org_id)));
create policy team_members_recovery_insert on public.team_members for insert to authenticated with check (exists(select 1 from public.teams t where t.id=team_id and private.is_org_admin(t.org_id)) and exists(select 1 from public.teams t join public.organisation_members m on m.org_id=t.org_id where t.id=team_id and m.user_id=team_members.user_id));
create policy team_members_recovery_update on public.team_members for update to authenticated using (exists(select 1 from public.teams t where t.id=team_id and private.is_org_admin(t.org_id))) with check (exists(select 1 from public.teams t where t.id=team_id and private.is_org_admin(t.org_id)) and exists(select 1 from public.teams t join public.organisation_members m on m.org_id=t.org_id where t.id=team_id and m.user_id=team_members.user_id));
create policy team_members_recovery_delete on public.team_members for delete to authenticated using (exists(select 1 from public.teams t where t.id=team_id and private.is_org_admin(t.org_id)));
