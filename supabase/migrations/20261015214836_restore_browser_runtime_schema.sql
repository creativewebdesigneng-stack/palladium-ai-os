-- Recover the four existing browser contracts. No worker, profile, secret, session or grant is backfilled.
do $$ begin
  if to_regclass('public.browser_credentials') is not null or to_regclass('public.browser_artifacts') is not null or to_regclass('public.browser_profiles') is not null or to_regclass('public.browser_sessions') is not null then
    raise exception 'Browser recovery requires all four tables to be absent; review partial state first.';
  end if;
end $$;


-- Original contract: 20260828001000_browser_credentials.sql
create table public.browser_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  name text not null,
  domain text not null,
  username_ciphertext text null,
  password_ciphertext text null,
  totp_secret_ciphertext text null,
  totp_identifier text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz null,
  constraint browser_credentials_name_length check (char_length(name) between 1 and 120),
  constraint browser_credentials_domain_length check (char_length(domain) between 1 and 253),
  constraint browser_credentials_secret_present check (
    username_ciphertext is not null or password_ciphertext is not null or totp_secret_ciphertext is not null
  )
);

create unique index if not exists browser_credentials_user_name_unique
  on public.browser_credentials(user_id, lower(name));

create index if not exists browser_credentials_user_domain_idx
  on public.browser_credentials(user_id, lower(domain));

alter table public.browser_credentials enable row level security;
revoke all on public.browser_credentials from public,anon,authenticated;
grant all on public.browser_credentials to service_role;

grant select,insert,update,delete on public.browser_credentials to authenticated;

create policy browser_credentials_select_own on public.browser_credentials for select to authenticated using(user_id=(select auth.uid()));

create policy browser_credentials_delete_own on public.browser_credentials for delete to authenticated using(user_id=(select auth.uid()));

create policy browser_credentials_insert_own on public.browser_credentials for insert to authenticated with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy browser_credentials_update_own on public.browser_credentials for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

-- Original contract: 20260828002000_browser_artifacts.sql
create table public.browser_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid null,
  task_id uuid null,
  kind text not null default 'download',
  filename text not null,
  mime_type text null,
  size_bytes bigint not null,
  sha256 text not null,
  storage_path text not null,
  source_url text null,
  created_at timestamptz not null default now(),
  constraint browser_artifacts_size_check check (size_bytes >= 0 and size_bytes <= 26214400),
  constraint browser_artifacts_kind_check check (kind in ('download','screenshot','trace'))
);

create index if not exists browser_artifacts_user_created_idx
  on public.browser_artifacts(user_id, created_at desc);

create index if not exists browser_artifacts_task_idx
  on public.browser_artifacts(task_id) where task_id is not null;

alter table public.browser_artifacts enable row level security;
revoke all on public.browser_artifacts from public,anon,authenticated;
grant all on public.browser_artifacts to service_role;

grant select,delete on public.browser_artifacts to authenticated;

create policy browser_artifacts_select_own on public.browser_artifacts for select to authenticated using(user_id=(select auth.uid()));

create policy browser_artifacts_delete_own on public.browser_artifacts for delete to authenticated using(user_id=(select auth.uid()));

-- Original contract: 20260828003000_browser_profiles.sql
create table public.browser_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid not null,
  scope_key text not null,
  domain_scope text[] not null default '{}',
  state_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz null,
  constraint browser_profiles_owner_agent_scope_unique unique (user_id, agent_id, scope_key)
);

create index if not exists browser_profiles_user_agent_updated_idx
  on public.browser_profiles (user_id, agent_id, updated_at desc);

alter table public.browser_profiles enable row level security;
revoke all on public.browser_profiles from public,anon,authenticated;
grant all on public.browser_profiles to service_role;

grant select,insert,update,delete on public.browser_profiles to authenticated;

create policy browser_profiles_select_own on public.browser_profiles for select to authenticated using(user_id=(select auth.uid()));

create policy browser_profiles_delete_own on public.browser_profiles for delete to authenticated using(user_id=(select auth.uid()));

create policy browser_profiles_insert_own on public.browser_profiles for insert to authenticated with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (exists(select 1 from public.personal_agents a where a.id=browser_profiles.agent_id and a.user_id=(select auth.uid()))));

create policy browser_profiles_update_own on public.browser_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)) and (exists(select 1 from public.personal_agents a where a.id=browser_profiles.agent_id and a.user_id=(select auth.uid()))));

-- Original contract: 20260810101444_9fc56d32-8ad2-4720-8309-d0891a284ad6.sql
create table public.browser_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete cascade,
  provider text not null,
  allowed_domains text[] not null default '{}',
  status text not null default 'idle',
  steps jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.browser_sessions enable row level security;
revoke all on public.browser_sessions from public,anon,authenticated;
grant all on public.browser_sessions to service_role;

grant select,insert,update,delete on public.browser_sessions to authenticated;

create policy browser_sessions_select_own on public.browser_sessions for select to authenticated using(user_id=(select auth.uid()));

create policy browser_sessions_delete_own on public.browser_sessions for delete to authenticated using(user_id=(select auth.uid()));

create policy browser_sessions_insert_own on public.browser_sessions for insert to authenticated with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=browser_sessions.agent_id and a.user_id=(select auth.uid()))) and (task_id is null or exists(select 1 from public.personal_tasks t where t.id=browser_sessions.task_id and t.user_id=(select auth.uid()))));

create policy browser_sessions_update_own on public.browser_sessions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents a where a.id=browser_sessions.agent_id and a.user_id=(select auth.uid()))) and (task_id is null or exists(select 1 from public.personal_tasks t where t.id=browser_sessions.task_id and t.user_id=(select auth.uid()))));

create index browser_sessions_owner_created_idx on public.browser_sessions(user_id,created_at desc);

create index browser_sessions_agent_idx on public.browser_sessions(agent_id);

create index browser_sessions_task_idx on public.browser_sessions(task_id);

create trigger browser_sessions_updated_at before update on public.browser_sessions for each row execute function public.set_updated_at();

notify pgrst,'reload schema';
