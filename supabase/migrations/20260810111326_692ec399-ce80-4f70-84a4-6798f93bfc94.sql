-- =========================================================
-- PHASE 1: ORGANISATIONS, PLANS, PLATFORM CORE
-- =========================================================

create type public.org_role as enum ('owner','admin','member');
create type public.subscription_status as enum ('trialing','active','past_due','canceled','incomplete','unpaid','paused');
create type public.exec_status as enum ('pending','queued','running','succeeded','failed','cancelled');
create type public.listing_status as enum ('draft','pending_review','published','rejected','unlisted');

-- ---------------------------------------------------------
-- ORGANISATIONS
-- ---------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  logo_url text,
  billing_email text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.organisations to authenticated;
grant all on public.organisations to service_role;
alter table public.organisations enable row level security;

create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
grant select, insert, update, delete on public.organisation_members to authenticated;
grant all on public.organisation_members to service_role;
alter table public.organisation_members enable row level security;

-- security definer helpers (avoid recursive RLS)
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _org is not null and exists (
    select 1 from public.organisation_members m
    where m.org_id = _org and m.user_id = auth.uid()
  )
$$;

create or replace function public.has_org_role(_org uuid, _roles public.org_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select _org is not null and exists (
    select 1 from public.organisation_members m
    where m.org_id = _org and m.user_id = auth.uid() and m.role = any(_roles)
  )
$$;

create or replace function public.org_admin(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(_org, array['owner','admin']::public.org_role[])
$$;

-- personal-or-org ownership predicate used across tables
create or replace function public.can_access(_org uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (_org is null and _user = auth.uid()) or public.is_org_member(_org)
$$;

create policy orgs_select on public.organisations for select to authenticated
  using (public.is_org_member(id) or owner_id = auth.uid());
create policy orgs_insert on public.organisations for insert to authenticated
  with check (owner_id = auth.uid());
create policy orgs_update on public.organisations for update to authenticated
  using (public.org_admin(id)) with check (public.org_admin(id));

create policy om_select on public.organisation_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy om_insert on public.organisation_members for insert to authenticated
  with check (public.org_admin(org_id));
create policy om_update on public.organisation_members for update to authenticated
  using (public.org_admin(org_id)) with check (public.org_admin(org_id));
create policy om_delete on public.organisation_members for delete to authenticated
  using (public.org_admin(org_id) or user_id = auth.uid());

-- owner membership is created automatically
create or replace function public.handle_new_organisation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.organisation_members (org_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (org_id, user_id) do update set role = 'owner';
  return new;
end $$;
create trigger organisations_owner_member after insert on public.organisations
  for each row execute function public.handle_new_organisation();
create trigger organisations_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();
create trigger organisation_members_updated_at before update on public.organisation_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- TEAMS
-- ---------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.teams to authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;
create policy teams_select on public.teams for select to authenticated using (public.is_org_member(org_id));
create policy teams_write on public.teams for all to authenticated
  using (public.org_admin(org_id)) with check (public.org_admin(org_id));
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);
grant select, insert, update, delete on public.team_members to authenticated;
grant all on public.team_members to service_role;
alter table public.team_members enable row level security;
create or replace function public.team_org(_team uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.teams where id = _team
$$;
create policy tm_select on public.team_members for select to authenticated
  using (public.is_org_member(public.team_org(team_id)));
create policy tm_write on public.team_members for all to authenticated
  using (public.org_admin(public.team_org(team_id))) with check (public.org_admin(public.team_org(team_id)));

-- ---------------------------------------------------------
-- PLANS + SUBSCRIPTIONS (server-side source of truth)
-- ---------------------------------------------------------
create table public.plans (
  code text primary key,
  name text not null,
  description text,
  price_pence integer not null default 0,
  currency text not null default 'GBP',
  billing_interval text not null default 'month',
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy plans_public_read on public.plans for select to anon, authenticated using (is_active);
create trigger plans_updated_at before update on public.plans for each row execute function public.set_updated_at();

insert into public.plans (code, name, description, price_pence, sort_order, features, limits) values
 ('explorer','Explorer','Get started with a personal AI workforce.',0,1,
  '["1 workspace","3 agents","Community support"]'::jsonb,
  '{"agents":3,"tasks_per_month":200,"seats":1,"storage_mb":200}'::jsonb),
 ('builder','Builder','For builders shipping real automation.',2000,2,
  '["Unlimited agents","Workflows","Marketplace publishing","Email support"]'::jsonb,
  '{"agents":50,"tasks_per_month":5000,"seats":3,"storage_mb":5000}'::jsonb),
 ('business','Business','Full AI workforce for growing teams.',150000,3,
  '["Organisations & teams","Workforces","Integrations","Priority support","Audit logs"]'::jsonb,
  '{"agents":500,"tasks_per_month":100000,"seats":25,"storage_mb":100000}'::jsonb),
 ('enterprise','Enterprise','Governance, scale and dedicated support.',300000,4,
  '["SSO","Unlimited seats","Dedicated success manager","Custom SLAs","Advanced governance"]'::jsonb,
  '{"agents":-1,"tasks_per_month":-1,"seats":-1,"storage_mb":-1}'::jsonb);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  plan_code text not null references public.plans(code),
  status public.subscription_status not null default 'active',
  seats integer not null default 1,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscriptions_org_unique on public.subscriptions (org_id) where org_id is not null;
create unique index subscriptions_user_unique on public.subscriptions (user_id) where org_id is null and user_id is not null;
-- read-only to end users: writes happen with the service role only
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy subs_select on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- AGENTS: extend existing personal_agents, add versions + tasks
-- ---------------------------------------------------------
alter table public.personal_agents
  add column if not exists slug text,
  add column if not exists model text not null default 'google/gemini-2.5-flash',
  add column if not exists system_prompt text,
  add column if not exists temperature numeric not null default 0.7,
  add column if not exists visibility text not null default 'private',
  add column if not exists current_version integer not null default 1,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists org_id_fk uuid references public.organisations(id) on delete cascade;

create policy pa_org_select on public.personal_agents for select to authenticated
  using (public.is_org_member(org_id_fk));

create table public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.personal_agents(id) on delete cascade,
  version integer not null,
  system_prompt text,
  instructions text,
  model text,
  config jsonb not null default '{}'::jsonb,
  changelog text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agent_id, version)
);
grant select, insert on public.agent_versions to authenticated;
grant all on public.agent_versions to service_role;
alter table public.agent_versions enable row level security;
create or replace function public.agent_is_visible(_agent uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.personal_agents a
    where a.id = _agent and (a.user_id = auth.uid() or public.is_org_member(a.org_id_fk))
  )
$$;
create policy av_select on public.agent_versions for select to authenticated using (public.agent_is_visible(agent_id));
create policy av_insert on public.agent_versions for insert to authenticated with check (public.agent_is_visible(agent_id));

create table public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  task_id uuid references public.personal_tasks(id) on delete set null,
  input text not null,
  output jsonb,
  status public.exec_status not null default 'pending',
  error text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_pence numeric not null default 0,
  duration_ms integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert on public.agent_tasks to authenticated;
grant all on public.agent_tasks to service_role;
alter table public.agent_tasks enable row level security;
create policy at_select on public.agent_tasks for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy at_insert on public.agent_tasks for insert to authenticated
  with check (user_id = auth.uid() and public.can_access(org_id, user_id));
create trigger agent_tasks_updated_at before update on public.agent_tasks for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- WORKFLOWS
-- ---------------------------------------------------------
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  trigger_config jsonb not null default '{}'::jsonb,
  schedule text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workflows to authenticated;
grant all on public.workflows to service_role;
alter table public.workflows enable row level security;
create policy wf_select on public.workflows for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy wf_write on public.workflows for all to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check ((user_id = auth.uid() and public.can_access(org_id, user_id)) or public.org_admin(org_id));
create trigger workflows_updated_at before update on public.workflows for each row execute function public.set_updated_at();

create or replace function public.workflow_is_visible(_wf uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workflows w
    where w.id = _wf and (w.user_id = auth.uid() or public.is_org_member(w.org_id))
  )
$$;

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  position integer not null default 0,
  name text,
  kind text not null default 'agent',
  agent_id uuid references public.personal_agents(id) on delete set null,
  tool text,
  config jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workflow_steps to authenticated;
grant all on public.workflow_steps to service_role;
alter table public.workflow_steps enable row level security;
create policy ws_all on public.workflow_steps for all to authenticated
  using (public.workflow_is_visible(workflow_id)) with check (public.workflow_is_visible(workflow_id));
create trigger workflow_steps_updated_at before update on public.workflow_steps for each row execute function public.set_updated_at();

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.exec_status not null default 'pending',
  step_results jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.workflow_runs to authenticated;
grant all on public.workflow_runs to service_role;
alter table public.workflow_runs enable row level security;
create policy wr_select on public.workflow_runs for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create trigger workflow_runs_updated_at before update on public.workflow_runs for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- WORKFORCES
-- ---------------------------------------------------------
create table public.workforces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  purpose text,
  department text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workforces to authenticated;
grant all on public.workforces to service_role;
alter table public.workforces enable row level security;
create policy wfo_select on public.workforces for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy wfo_write on public.workforces for all to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check ((user_id = auth.uid() and public.can_access(org_id, user_id)) or public.org_admin(org_id));
create trigger workforces_updated_at before update on public.workforces for each row execute function public.set_updated_at();

create or replace function public.workforce_is_visible(_wf uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workforces w
    where w.id = _wf and (w.user_id = auth.uid() or public.is_org_member(w.org_id))
  )
$$;

create table public.workforce_agents (
  id uuid primary key default gen_random_uuid(),
  workforce_id uuid not null references public.workforces(id) on delete cascade,
  agent_id uuid not null references public.personal_agents(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (workforce_id, agent_id)
);
grant select, insert, update, delete on public.workforce_agents to authenticated;
grant all on public.workforce_agents to service_role;
alter table public.workforce_agents enable row level security;
create policy wfa_all on public.workforce_agents for all to authenticated
  using (public.workforce_is_visible(workforce_id)) with check (public.workforce_is_visible(workforce_id));

-- ---------------------------------------------------------
-- MEMORY (reuse personal_memories) + DOCUMENTS
-- ---------------------------------------------------------
alter table public.personal_memories
  add column if not exists org_id uuid references public.organisations(id) on delete cascade,
  add column if not exists agent_id uuid references public.personal_agents(id) on delete cascade,
  add column if not exists scope text not null default 'personal';
create policy pm_org_select on public.personal_memories for select to authenticated
  using (public.is_org_member(org_id));

create table public.memory_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  title text not null,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'uploaded',
  chunk_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.memory_documents to authenticated;
grant all on public.memory_documents to service_role;
alter table public.memory_documents enable row level security;
create policy md_select on public.memory_documents for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy md_write on public.memory_documents for all to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (user_id = auth.uid() and public.can_access(org_id, user_id));
create trigger memory_documents_updated_at before update on public.memory_documents for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- TOOLS
-- ---------------------------------------------------------
create table public.tools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default 'general',
  description text,
  kind text not null default 'builtin',
  requires_approval boolean not null default false,
  risk_level public.mc_risk_level not null default 'low',
  config_schema jsonb not null default '{}'::jsonb,
  min_plan text references public.plans(code),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.tools to authenticated;
grant all on public.tools to service_role;
alter table public.tools enable row level security;
create policy tools_read on public.tools for select to authenticated using (is_active);
create trigger tools_updated_at before update on public.tools for each row execute function public.set_updated_at();

insert into public.tools (slug, name, category, description, requires_approval, risk_level, min_plan) values
 ('web_search','Web search','research','Search the public web for information.',false,'low','explorer'),
 ('browse','Browser agent','automation','Visit allow-listed websites and extract information.',false,'medium','builder'),
 ('shopping','Shopping research','commerce','Compare products, prices and delivery across retailers.',false,'medium','builder'),
 ('checkout','Prepare checkout','commerce','Prepare a checkout for the user to pay themselves.',true,'high','builder'),
 ('email_send','Send email','communication','Send an email on the user''s behalf.',true,'high','builder'),
 ('calendar','Calendar','productivity','Read and create calendar events.',false,'low','builder'),
 ('files','Files & documents','knowledge','Read and analyse uploaded documents.',false,'low','explorer'),
 ('code_exec','Code execution','development','Run sandboxed code for analysis tasks.',true,'high','business'),
 ('crm','CRM','business','Read and update CRM records.',true,'medium','business'),
 ('payments','Payments','finance','Inspect payment and invoice data.',true,'high','business');

alter table public.tool_permissions
  add column if not exists org_id uuid references public.organisations(id) on delete cascade;
create policy tp_org_select on public.tool_permissions for select to authenticated
  using (public.is_org_member(org_id));

create table public.tool_executions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid references public.personal_agents(id) on delete set null,
  agent_task_id uuid references public.agent_tasks(id) on delete set null,
  tool text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status public.exec_status not null default 'pending',
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
grant select on public.tool_executions to authenticated;
grant all on public.tool_executions to service_role;
alter table public.tool_executions enable row level security;
create policy te_select on public.tool_executions for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));

-- ---------------------------------------------------------
-- MARKETPLACE
-- ---------------------------------------------------------
create table public.marketplace_agents (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.personal_agents(id) on delete set null,
  publisher_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete set null,
  title text not null,
  slug text not null unique,
  summary text,
  description text,
  category text not null default 'general',
  tags text[] not null default '{}',
  icon text,
  price_pence integer not null default 0,
  currency text not null default 'GBP',
  status public.listing_status not null default 'draft',
  install_count integer not null default 0,
  rating_avg numeric not null default 0,
  rating_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.marketplace_agents to anon;
grant select, insert, update, delete on public.marketplace_agents to authenticated;
grant all on public.marketplace_agents to service_role;
alter table public.marketplace_agents enable row level security;
create policy ma_public_read on public.marketplace_agents for select to anon, authenticated
  using (status = 'published');
create policy ma_publisher_read on public.marketplace_agents for select to authenticated
  using (publisher_id = auth.uid());
create policy ma_publisher_write on public.marketplace_agents for all to authenticated
  using (publisher_id = auth.uid()) with check (publisher_id = auth.uid());
create trigger marketplace_agents_updated_at before update on public.marketplace_agents
  for each row execute function public.set_updated_at();

create table public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, user_id)
);
grant select on public.marketplace_reviews to anon;
grant select, insert, update, delete on public.marketplace_reviews to authenticated;
grant all on public.marketplace_reviews to service_role;
alter table public.marketplace_reviews enable row level security;
create policy mr_read on public.marketplace_reviews for select to anon, authenticated using (true);
create policy mr_write_own on public.marketplace_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger marketplace_reviews_updated_at before update on public.marketplace_reviews
  for each row execute function public.set_updated_at();

create table public.marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_agents(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete set null,
  amount_pence integer not null default 0,
  currency text not null default 'GBP',
  status text not null default 'pending',
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.marketplace_purchases to authenticated;
grant all on public.marketplace_purchases to service_role;
alter table public.marketplace_purchases enable row level security;
create policy mp_select on public.marketplace_purchases for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create trigger marketplace_purchases_updated_at before update on public.marketplace_purchases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- USAGE, API KEYS, WEBHOOKS, NOTIFICATIONS, INTEGRATIONS
-- ---------------------------------------------------------
create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  quantity numeric not null default 1,
  unit text not null default 'count',
  agent_id uuid references public.personal_agents(id) on delete set null,
  agent_task_id uuid references public.agent_tasks(id) on delete set null,
  period_start date not null default (date_trunc('month', now())::date),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index usage_records_period_idx on public.usage_records (coalesce(org_id, user_id), metric, period_start);
grant select on public.usage_records to authenticated;
grant all on public.usage_records to service_role;
alter table public.usage_records enable row level security;
create policy ur_select on public.usage_records for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index api_keys_hash_unique on public.api_keys (key_hash);
grant select, update on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy ak_select on public.api_keys for select to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id));
create policy ak_revoke on public.api_keys for update to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (user_id = auth.uid() or public.org_admin(org_id));
create trigger api_keys_updated_at before update on public.api_keys for each row execute function public.set_updated_at();

create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  secret_hash text,
  is_active boolean not null default true,
  last_delivery_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.webhooks to authenticated;
grant all on public.webhooks to service_role;
alter table public.webhooks enable row level security;
create policy wh_select on public.webhooks for select to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id));
create policy wh_write on public.webhooks for all to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (user_id = auth.uid() and public.can_access(org_id, user_id));
create trigger webhooks_updated_at before update on public.webhooks for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organisations(id) on delete cascade,
  kind text not null default 'info',
  title text not null,
  body text,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy nt_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy nt_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nt_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  name text,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  secret_ref text,
  scopes text[] not null default '{}',
  connected_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.integrations to authenticated;
grant all on public.integrations to service_role;
alter table public.integrations enable row level security;
create policy ig_select on public.integrations for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(org_id));
create policy ig_write on public.integrations for all to authenticated
  using (user_id = auth.uid() or public.org_admin(org_id))
  with check (user_id = auth.uid() and public.can_access(org_id, user_id));
create trigger integrations_updated_at before update on public.integrations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- ORG SCOPE FOR EXISTING AUDIT + APPROVALS
-- ---------------------------------------------------------
alter table public.mission_audit_logs
  add column if not exists org_id uuid references public.organisations(id) on delete cascade,
  add column if not exists ip_address text;
create policy mal_org_select on public.mission_audit_logs for select to authenticated
  using (public.org_admin(org_id));

alter table public.approval_requests
  add column if not exists org_id uuid references public.organisations(id) on delete cascade,
  add column if not exists expires_at timestamptz;
create policy ar_org_select on public.approval_requests for select to authenticated
  using (public.is_org_member(org_id));

alter table public.personal_tasks
  add column if not exists org_id uuid references public.organisations(id) on delete cascade,
  add column if not exists workflow_id uuid references public.workflows(id) on delete set null;
create policy pt_org_select on public.personal_tasks for select to authenticated
  using (public.is_org_member(org_id));

alter table public.agent_activities
  add column if not exists org_id uuid references public.organisations(id) on delete cascade;
create policy aa_org_select on public.agent_activities for select to authenticated
  using (public.is_org_member(org_id));

-- ---------------------------------------------------------
-- ENTITLEMENT HELPER (server-side plan resolution)
-- ---------------------------------------------------------
create or replace function public.effective_plan(_user uuid, _org uuid default null)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.plan_code from public.subscriptions s
      where s.status in ('trialing','active','past_due')
        and ((_org is not null and s.org_id = _org) or (_org is null and s.user_id = _user and s.org_id is null))
      order by s.updated_at desc limit 1),
    'explorer')
$$;
revoke all on function public.effective_plan(uuid, uuid) from anon;