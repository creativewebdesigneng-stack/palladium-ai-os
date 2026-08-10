-- ============ shared helpers ============
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user',
  org_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ roles ============
do $$ begin
  create type public.app_role as enum ('admin','moderator','user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ============ enums ============
do $$ begin
  create type public.autonomy_level as enum ('assist','prepare','execute','approval_required');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mc_task_status as enum ('pending','queued','running','awaiting_approval','completed','failed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mc_approval_status as enum ('pending','approved','rejected','expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.mc_risk_level as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

-- ============ personal agents ============
create table public.personal_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  name text not null,
  category text not null default 'custom',
  purpose text,
  personality text default 'professional',
  instructions text,
  preferences jsonb not null default '{}'::jsonb,
  budget_limit numeric(12,2),
  currency text not null default 'GBP',
  allowed_tools text[] not null default '{}',
  requires_approval boolean not null default true,
  autonomy public.autonomy_level not null default 'prepare',
  schedule text,
  status text not null default 'active',
  scope text not null default 'personal',
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.personal_agents to authenticated;
grant all on public.personal_agents to service_role;
alter table public.personal_agents enable row level security;
create policy "pa_all_own" on public.personal_agents for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger personal_agents_updated_at before update on public.personal_agents for each row execute function public.set_updated_at();
create index personal_agents_user_idx on public.personal_agents(user_id);

-- ============ personal memory / preferences ============
create table public.personal_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  key text not null,
  value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.personal_memories to authenticated;
grant all on public.personal_memories to service_role;
alter table public.personal_memories enable row level security;
create policy "pm_all_own" on public.personal_memories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger personal_memories_updated_at before update on public.personal_memories for each row execute function public.set_updated_at();
create index personal_memories_user_idx on public.personal_memories(user_id);

-- ============ personal tasks ============
create table public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  request text not null,
  title text,
  category text not null default 'custom',
  scope text not null default 'personal',
  status public.mc_task_status not null default 'pending',
  priority text not null default 'normal',
  requires_approval boolean not null default false,
  involves_money boolean not null default false,
  required_tools text[] not null default '{}',
  result jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.personal_tasks to authenticated;
grant all on public.personal_tasks to service_role;
alter table public.personal_tasks enable row level security;
create policy "pt_all_own" on public.personal_tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger personal_tasks_updated_at before update on public.personal_tasks for each row execute function public.set_updated_at();
create index personal_tasks_user_idx on public.personal_tasks(user_id, status);

-- ============ approval requests ============
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete cascade,
  action_type text not null default 'other',
  title text not null,
  details jsonb not null default '{}'::jsonb,
  summary text,
  estimated_cost numeric(12,2),
  currency text not null default 'GBP',
  risk_level public.mc_risk_level not null default 'low',
  status public.mc_approval_status not null default 'pending',
  decided_at timestamptz,
  decided_by uuid,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.approval_requests to authenticated;
grant all on public.approval_requests to service_role;
alter table public.approval_requests enable row level security;
create policy "ar_all_own" on public.approval_requests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger approval_requests_updated_at before update on public.approval_requests for each row execute function public.set_updated_at();
create index approval_requests_user_idx on public.approval_requests(user_id, status);

-- ============ shopping ============
create table public.shopping_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete cascade,
  requirement text not null,
  budget numeric(12,2),
  currency text not null default 'GBP',
  status public.mc_task_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.shopping_tasks to authenticated;
grant all on public.shopping_tasks to service_role;
alter table public.shopping_tasks enable row level security;
create policy "st_all_own" on public.shopping_tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger shopping_tasks_updated_at before update on public.shopping_tasks for each row execute function public.set_updated_at();

create table public.shopping_results (
  id uuid primary key default gen_random_uuid(),
  shopping_task_id uuid not null references public.shopping_tasks(id) on delete cascade,
  product text not null,
  price numeric(12,2),
  currency text not null default 'GBP',
  seller text,
  delivery text,
  delivery_cost numeric(12,2),
  rating numeric(3,2),
  url text,
  image_url text,
  specs jsonb not null default '{}'::jsonb,
  reason text,
  in_stock boolean not null default true,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.shopping_results to authenticated;
grant all on public.shopping_results to service_role;
alter table public.shopping_results enable row level security;
create policy "sr_all_own" on public.shopping_results for all to authenticated
  using (exists (select 1 from public.shopping_tasks t where t.id = shopping_task_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.shopping_tasks t where t.id = shopping_task_id and t.user_id = auth.uid()));
create trigger shopping_results_updated_at before update on public.shopping_results for each row execute function public.set_updated_at();
create index shopping_results_task_idx on public.shopping_results(shopping_task_id);

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shopping_task_id uuid references public.shopping_tasks(id) on delete cascade,
  shopping_result_id uuid references public.shopping_results(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  product text not null,
  seller text,
  item_price numeric(12,2) not null default 0,
  delivery_cost numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  fees numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'GBP',
  status text not null default 'awaiting_approval',
  checkout_url text,
  checkout_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.purchase_requests to authenticated;
grant all on public.purchase_requests to service_role;
alter table public.purchase_requests enable row level security;
create policy "pr_all_own" on public.purchase_requests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger purchase_requests_updated_at before update on public.purchase_requests for each row execute function public.set_updated_at();

-- ============ browser sessions & tool permissions ============
create table public.browser_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete cascade,
  provider text not null default 'simulated',
  allowed_domains text[] not null default '{}',
  status text not null default 'idle',
  steps jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.browser_sessions to authenticated;
grant all on public.browser_sessions to service_role;
alter table public.browser_sessions enable row level security;
create policy "bs_all_own" on public.browser_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger browser_sessions_updated_at before update on public.browser_sessions for each row execute function public.set_updated_at();

create table public.tool_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete cascade,
  tool text not null,
  enabled boolean not null default true,
  requires_approval boolean not null default true,
  allowed_domains text[] not null default '{}',
  spend_cap numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, tool)
);
grant select, insert, update, delete on public.tool_permissions to authenticated;
grant all on public.tool_permissions to service_role;
alter table public.tool_permissions enable row level security;
create policy "tp_all_own" on public.tool_permissions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger tool_permissions_updated_at before update on public.tool_permissions for each row execute function public.set_updated_at();

-- ============ activity feed ============
create table public.agent_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete cascade,
  kind text not null default 'info',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.agent_activities to authenticated;
grant all on public.agent_activities to service_role;
alter table public.agent_activities enable row level security;
create policy "aa_select_own" on public.agent_activities for select to authenticated using (auth.uid() = user_id);
create policy "aa_insert_own" on public.agent_activities for insert to authenticated with check (auth.uid() = user_id);
create index agent_activities_user_idx on public.agent_activities(user_id, created_at desc);

-- ============ audit log ============
create table public.mission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  status text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.mission_audit_logs to authenticated;
grant all on public.mission_audit_logs to service_role;
alter table public.mission_audit_logs enable row level security;
create policy "mal_select_own" on public.mission_audit_logs for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create index mission_audit_logs_user_idx on public.mission_audit_logs(user_id, created_at desc);