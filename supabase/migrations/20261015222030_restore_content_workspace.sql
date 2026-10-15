-- Restore existing private content contracts; no catalogue, capability, provider or content backfill.
do $$ begin
 if to_regclass('public.saved_prompts') is not null or to_regclass('public.saved_prompt_versions') is not null or to_regclass('public.saved_prompt_runs') is not null or to_regclass('public.smart_tables') is not null or to_regclass('public.smart_table_records') is not null or to_regclass('public.smart_table_views') is not null or to_regclass('public.zen_notes') is not null or to_regclass('public.html_studio_documents') is not null or to_regclass('public.seo_projects') is not null or to_regclass('public.seo_snapshots') is not null or to_regclass('public.task_focus_sessions') is not null then
 raise exception 'Content workspace recovery requires all eleven tables absent; review partial state first.';
 end if;
end $$;

-- Contract: 20260820093000_prompt_workspace.sql
create table public.saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  system_prompt text,
  prompt_text text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260820093000_prompt_workspace.sql
create table public.saved_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.saved_prompts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  name text not null,
  description text,
  system_prompt text,
  prompt_text text not null,
  created_at timestamptz not null default now(),
  unique(prompt_id, version)
);

-- Contract: 20260820093000_prompt_workspace.sql
create table public.saved_prompt_runs (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.saved_prompts(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_version integer not null check (prompt_version > 0),
  input_text text,
  output_text text,
  status text not null default 'running' check (status in ('running','succeeded','failed')),
  provider text,
  model text,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Contract: 20260829140500_smart_tables.sql
create table public.smart_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  description text null,
  fields jsonb not null default '[]'::jsonb,
  default_view text not null default 'grid' check (default_view in ('grid','kanban','form')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829140500_smart_tables.sql
create table public.smart_table_records (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.smart_tables(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829140500_smart_tables.sql
create table public.smart_table_views (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.smart_tables(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'grid' check (kind in ('grid','kanban','form')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828193000_html_studio_zennotes.sql
create table public.zen_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid null,
  title text not null default 'Untitled note',
  body text not null default '',
  note_kind text not null default 'note' check (note_kind in ('note','daily','weekly')),
  lifecycle text not null default 'active' check (lifecycle in ('active','archived','trash')),
  tags text[] not null default '{}',
  pinned boolean not null default false,
  knowledge_document_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828193000_html_studio_zennotes.sql
create table public.html_studio_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid null,
  title text not null default 'Untitled HTML',
  source_kind text not null default 'text' check (source_kind in ('text','markdown','csv','json','sql','note','file')),
  source_text text not null default '',
  html text not null default '',
  surface text not null default 'document' check (surface in ('document','report','poster','deck','social','prototype','resume','frame')),
  status text not null default 'draft' check (status in ('draft','ready','archived')),
  source_note_id uuid null references public.zen_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828213000_productivity_seo_native.sql
create table public.seo_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null,
  domain text not null,
  provider text not null default 'provider-neutral',
  location_code text null,
  language_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260828213000_productivity_seo_native.sql
create table public.seo_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.seo_projects(id) on delete cascade,
  kind text not null check (kind in ('keyword','rank','backlink','audit')),
  subject text not null,
  metrics jsonb not null default '{}'::jsonb,
  notes text not null default '',
  source text not null default 'manual',
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Contract: 20260828213000_productivity_seo_native.sql
create table public.task_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_source text null check (task_source is null or task_source in ('personal_tasks','agent_tasks')),
  task_id uuid null,
  label text not null default 'Focus session',
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  duration_seconds integer null check (duration_seconds is null or duration_seconds >= 0),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index saved_prompts_recovery_0_idx on public.saved_prompts(user_id,updated_at desc);
create index saved_prompt_versions_recovery_0_idx on public.saved_prompt_versions(user_id,prompt_id,version desc);
create index saved_prompt_runs_recovery_0_idx on public.saved_prompt_runs(user_id,created_at desc);
create index saved_prompt_runs_recovery_1_idx on public.saved_prompt_runs(prompt_id);
create index smart_tables_recovery_0_idx on public.smart_tables(user_id,updated_at desc);
create index smart_table_records_recovery_0_idx on public.smart_table_records(table_id,updated_at desc);
create index smart_table_records_recovery_1_idx on public.smart_table_records(user_id);
create index smart_table_views_recovery_0_idx on public.smart_table_views(table_id,created_at);
create index smart_table_views_recovery_1_idx on public.smart_table_views(user_id);
create index zen_notes_recovery_0_idx on public.zen_notes(user_id,updated_at desc);
create index zen_notes_recovery_1_idx on public.zen_notes(user_id,lifecycle);
create index zen_notes_recovery_2_idx on public.zen_notes(knowledge_document_id);
create index html_studio_documents_recovery_0_idx on public.html_studio_documents(user_id,updated_at desc);
create index html_studio_documents_recovery_1_idx on public.html_studio_documents(source_note_id);
create unique index seo_projects_recovery_0_idx on public.seo_projects(user_id,domain);
create index seo_snapshots_recovery_0_idx on public.seo_snapshots(user_id,project_id,observed_at desc);
create index seo_snapshots_recovery_1_idx on public.seo_snapshots(user_id,kind,observed_at desc);
create index seo_snapshots_recovery_2_idx on public.seo_snapshots(project_id);
create index task_focus_sessions_recovery_0_idx on public.task_focus_sessions(user_id,started_at desc);
create unique index task_focus_sessions_one_active_idx on public.task_focus_sessions(user_id) where ended_at is null;
alter table public.zen_notes add constraint zen_notes_knowledge_document_fk foreign key(knowledge_document_id) references public.memory_documents(id) on delete set null;
alter table public.task_focus_sessions add constraint focus_task_pair check ((task_source is null) = (task_id is null));

alter table public.saved_prompts enable row level security;
revoke all on public.saved_prompts from anon,authenticated;
grant select,insert,update,delete on public.saved_prompts to authenticated;
grant all on public.saved_prompts to service_role;
create policy saved_prompts_recovery_select on public.saved_prompts for select to authenticated using (user_id=(select auth.uid()));
create policy saved_prompts_recovery_insert on public.saved_prompts for insert to authenticated with check (user_id=(select auth.uid()));
create policy saved_prompts_recovery_update on public.saved_prompts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy saved_prompts_recovery_delete on public.saved_prompts for delete to authenticated using (user_id=(select auth.uid()));

alter table public.saved_prompt_versions enable row level security;
revoke all on public.saved_prompt_versions from anon,authenticated;
grant select,insert on public.saved_prompt_versions to authenticated;
grant all on public.saved_prompt_versions to service_role;
create policy saved_prompt_versions_recovery_select on public.saved_prompt_versions for select to authenticated using (user_id=(select auth.uid()));
create policy saved_prompt_versions_recovery_insert on public.saved_prompt_versions for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.saved_prompts p where p.id=prompt_id and p.user_id=(select auth.uid())));

alter table public.saved_prompt_runs enable row level security;
revoke all on public.saved_prompt_runs from anon,authenticated;
grant select,insert,update on public.saved_prompt_runs to authenticated;
grant all on public.saved_prompt_runs to service_role;
create policy saved_prompt_runs_recovery_select on public.saved_prompt_runs for select to authenticated using (user_id=(select auth.uid()));
create policy saved_prompt_runs_recovery_insert on public.saved_prompt_runs for insert to authenticated with check (user_id=(select auth.uid()) and (prompt_id is null or exists(select 1 from public.saved_prompts p where p.id=prompt_id and p.user_id=(select auth.uid()))));
create policy saved_prompt_runs_recovery_update on public.saved_prompt_runs for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (prompt_id is null or exists(select 1 from public.saved_prompts p where p.id=prompt_id and p.user_id=(select auth.uid()))));

alter table public.smart_tables enable row level security;
revoke all on public.smart_tables from anon,authenticated;
grant select,insert,update,delete on public.smart_tables to authenticated;
grant all on public.smart_tables to service_role;
create policy smart_tables_recovery_select on public.smart_tables for select to authenticated using (user_id=(select auth.uid()));
create policy smart_tables_recovery_insert on public.smart_tables for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy smart_tables_recovery_update on public.smart_tables for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy smart_tables_recovery_delete on public.smart_tables for delete to authenticated using (user_id=(select auth.uid()));

alter table public.smart_table_records enable row level security;
revoke all on public.smart_table_records from anon,authenticated;
grant select,insert,update,delete on public.smart_table_records to authenticated;
grant all on public.smart_table_records to service_role;
create policy smart_table_records_recovery_select on public.smart_table_records for select to authenticated using (user_id=(select auth.uid()));
create policy smart_table_records_recovery_insert on public.smart_table_records for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.smart_tables p where p.id=table_id and p.user_id=(select auth.uid())));
create policy smart_table_records_recovery_update on public.smart_table_records for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.smart_tables p where p.id=table_id and p.user_id=(select auth.uid())));
create policy smart_table_records_recovery_delete on public.smart_table_records for delete to authenticated using (user_id=(select auth.uid()));

alter table public.smart_table_views enable row level security;
revoke all on public.smart_table_views from anon,authenticated;
grant select,insert,update,delete on public.smart_table_views to authenticated;
grant all on public.smart_table_views to service_role;
create policy smart_table_views_recovery_select on public.smart_table_views for select to authenticated using (user_id=(select auth.uid()));
create policy smart_table_views_recovery_insert on public.smart_table_views for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.smart_tables p where p.id=table_id and p.user_id=(select auth.uid())));
create policy smart_table_views_recovery_update on public.smart_table_views for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.smart_tables p where p.id=table_id and p.user_id=(select auth.uid())));
create policy smart_table_views_recovery_delete on public.smart_table_views for delete to authenticated using (user_id=(select auth.uid()));

alter table public.zen_notes enable row level security;
revoke all on public.zen_notes from anon,authenticated;
grant select,insert,update,delete on public.zen_notes to authenticated;
grant all on public.zen_notes to service_role;
create policy zen_notes_recovery_select on public.zen_notes for select to authenticated using (user_id=(select auth.uid()));
create policy zen_notes_recovery_insert on public.zen_notes for insert to authenticated with check (user_id=(select auth.uid()) and (knowledge_document_id is null or exists(select 1 from public.memory_documents p where p.id=knowledge_document_id and p.user_id=(select auth.uid()))) and (org_id is null or private.is_org_member(org_id)));
create policy zen_notes_recovery_update on public.zen_notes for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (knowledge_document_id is null or exists(select 1 from public.memory_documents p where p.id=knowledge_document_id and p.user_id=(select auth.uid()))) and (org_id is null or private.is_org_member(org_id)));
create policy zen_notes_recovery_delete on public.zen_notes for delete to authenticated using (user_id=(select auth.uid()));

alter table public.html_studio_documents enable row level security;
revoke all on public.html_studio_documents from anon,authenticated;
grant select,insert,update,delete on public.html_studio_documents to authenticated;
grant all on public.html_studio_documents to service_role;
create policy html_studio_documents_recovery_select on public.html_studio_documents for select to authenticated using (user_id=(select auth.uid()));
create policy html_studio_documents_recovery_insert on public.html_studio_documents for insert to authenticated with check (user_id=(select auth.uid()) and (source_note_id is null or exists(select 1 from public.zen_notes p where p.id=source_note_id and p.user_id=(select auth.uid()))) and (org_id is null or private.is_org_member(org_id)));
create policy html_studio_documents_recovery_update on public.html_studio_documents for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (source_note_id is null or exists(select 1 from public.zen_notes p where p.id=source_note_id and p.user_id=(select auth.uid()))) and (org_id is null or private.is_org_member(org_id)));
create policy html_studio_documents_recovery_delete on public.html_studio_documents for delete to authenticated using (user_id=(select auth.uid()));

alter table public.seo_projects enable row level security;
revoke all on public.seo_projects from anon,authenticated;
grant select,insert,update,delete on public.seo_projects to authenticated;
grant all on public.seo_projects to service_role;
create policy seo_projects_recovery_select on public.seo_projects for select to authenticated using (user_id=(select auth.uid()));
create policy seo_projects_recovery_insert on public.seo_projects for insert to authenticated with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy seo_projects_recovery_update on public.seo_projects for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));
create policy seo_projects_recovery_delete on public.seo_projects for delete to authenticated using (user_id=(select auth.uid()));

alter table public.seo_snapshots enable row level security;
revoke all on public.seo_snapshots from anon,authenticated;
grant select,insert,update,delete on public.seo_snapshots to authenticated;
grant all on public.seo_snapshots to service_role;
create policy seo_snapshots_recovery_select on public.seo_snapshots for select to authenticated using (user_id=(select auth.uid()));
create policy seo_snapshots_recovery_insert on public.seo_snapshots for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.seo_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy seo_snapshots_recovery_update on public.seo_snapshots for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.seo_projects p where p.id=project_id and p.user_id=(select auth.uid())));
create policy seo_snapshots_recovery_delete on public.seo_snapshots for delete to authenticated using (user_id=(select auth.uid()));

alter table public.task_focus_sessions enable row level security;
revoke all on public.task_focus_sessions from anon,authenticated;
grant select,insert,update,delete on public.task_focus_sessions to authenticated;
grant all on public.task_focus_sessions to service_role;
create policy task_focus_sessions_recovery_select on public.task_focus_sessions for select to authenticated using (user_id=(select auth.uid()));
create policy task_focus_sessions_recovery_insert on public.task_focus_sessions for insert to authenticated with check (user_id=(select auth.uid()) and (task_id is null or (task_source='personal_tasks' and exists(select 1 from public.personal_tasks p where p.id=task_id and p.user_id=(select auth.uid()))) or (task_source='agent_tasks' and exists(select 1 from public.agent_tasks p where p.id=task_id and p.user_id=(select auth.uid())))));
create policy task_focus_sessions_recovery_update on public.task_focus_sessions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and (task_id is null or (task_source='personal_tasks' and exists(select 1 from public.personal_tasks p where p.id=task_id and p.user_id=(select auth.uid()))) or (task_source='agent_tasks' and exists(select 1 from public.agent_tasks p where p.id=task_id and p.user_id=(select auth.uid())))));
create policy task_focus_sessions_recovery_delete on public.task_focus_sessions for delete to authenticated using (user_id=(select auth.uid()));
