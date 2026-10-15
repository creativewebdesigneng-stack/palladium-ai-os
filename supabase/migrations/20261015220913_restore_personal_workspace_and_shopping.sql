-- Restore existing private workspace records only; no payment, campaign or autonomous capability is enabled.
do $$ begin
 if to_regclass('public.shopping_tasks') is not null or to_regclass('public.shopping_results') is not null or to_regclass('public.purchase_requests') is not null or to_regclass('public.product_watches') is not null or to_regclass('public.shopping_lists') is not null or to_regclass('public.shopping_list_items') is not null or to_regclass('public.spend_limits') is not null or to_regclass('public.personal_os_profiles') is not null or to_regclass('public.fitness_profiles') is not null or to_regclass('public.fitness_workouts') is not null or to_regclass('public.fitness_weight_entries') is not null or to_regclass('public.finance_transactions') is not null or to_regclass('public.marketing_campaigns') is not null then
 raise exception 'Personal workspace recovery requires all thirteen tables absent; review partial state first.';
 end if;
end $$;

-- Contract: 20260810101444_9fc56d32-8ad2-4720-8309-d0891a284ad6.sql

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

-- Contract: 20260810101444_9fc56d32-8ad2-4720-8309-d0891a284ad6.sql

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

-- Contract: 20260810101444_9fc56d32-8ad2-4720-8309-d0891a284ad6.sql

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

-- Contract: 20260812133133_7482435a-9e1d-44f7-bb0c-618427b2f857.sql

CREATE TABLE public.product_watches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id uuid REFERENCES public.personal_agents(id) ON DELETE SET NULL,
  shopping_result_id uuid REFERENCES public.shopping_results(id) ON DELETE SET NULL,
  product text NOT NULL,
  seller text,
  url text,
  currency text NOT NULL DEFAULT 'GBP',
  target_price numeric,
  last_price numeric,
  best_price numeric,
  in_stock boolean,
  status text NOT NULL DEFAULT 'active',
  last_checked_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Contract: 20260812133133_7482435a-9e1d-44f7-bb0c-618427b2f857.sql

CREATE TABLE public.shopping_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id uuid REFERENCES public.personal_agents(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  currency text NOT NULL DEFAULT 'GBP',
  budget numeric,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Contract: 20260812133133_7482435a-9e1d-44f7-bb0c-618427b2f857.sql

CREATE TABLE public.shopping_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  shopping_task_id uuid REFERENCES public.shopping_tasks(id) ON DELETE SET NULL,
  shopping_result_id uuid REFERENCES public.shopping_results(id) ON DELETE SET NULL,
  name text NOT NULL,
  notes text,
  quantity integer NOT NULL DEFAULT 1,
  budget numeric,
  status text NOT NULL DEFAULT 'pending',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Contract: 20260812133133_7482435a-9e1d-44f7-bb0c-618427b2f857.sql

CREATE TABLE public.spend_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  agent_id uuid REFERENCES public.personal_agents(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'user',
  currency text NOT NULL DEFAULT 'GBP',
  per_transaction_limit numeric,
  monthly_cap numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Contract: 20260904143000_blackstar_personal_os.sql

create table public.personal_os_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_agent_id uuid null,
  max_daily_spend_micros bigint not null default 0 check (max_daily_spend_micros >= 0),
  require_approval_for_messages boolean not null default true,
  require_approval_for_purchases boolean not null default true,
  require_approval_for_external_writes boolean not null default true,
  allowed_capabilities text[] not null default '{}'::text[],
  quiet_hours_start smallint null check (quiet_hours_start is null or quiet_hours_start between 0 and 23),
  quiet_hours_end smallint null check (quiet_hours_end is null or quiet_hours_end between 0 and 23),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829160500_web_deploy_notifications_fitness.sql

create table public.fitness_profiles (
  user_id uuid primary key default auth.uid(),
  goal text,
  units text not null default 'metric' check (units in ('metric','imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829160500_web_deploy_notifications_fitness.sql

create table public.fitness_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  scheduled_for date,
  notes text,
  exercises jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contract: 20260829160500_web_deploy_notifications_fitness.sql

create table public.fitness_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  weight numeric(8,2) not null check (weight > 0),
  recorded_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, recorded_on)
);

-- Contract: 20260814131853_9f3de9ad-03e6-4a21-8081-107369c20776.sql

CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  occurred_on date NOT NULL DEFAULT current_date,
  direction text NOT NULL DEFAULT 'expense',
  category text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  status text NOT NULL DEFAULT 'settled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contract: 20260814131853_9f3de9ad-03e6-4a21-8081-107369c20776.sql

CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'draft',
  budget numeric NOT NULL DEFAULT 0,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

alter table public.purchase_requests add column quantity integer not null default 1;

create trigger shopping_tasks_updated_at before update on public.shopping_tasks for each row execute function public.set_updated_at();

create index shopping_results_task_idx on public.shopping_results(shopping_task_id);

create trigger shopping_results_updated_at before update on public.shopping_results for each row execute function public.set_updated_at();

create trigger purchase_requests_updated_at before update on public.purchase_requests for each row execute function public.set_updated_at();

CREATE INDEX product_watches_user_idx ON public.product_watches (user_id, created_at DESC);

CREATE TRIGGER product_watches_updated_at BEFORE UPDATE ON public.product_watches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shopping_lists_user_idx ON public.shopping_lists (user_id, created_at DESC);

CREATE TRIGGER shopping_lists_updated_at BEFORE UPDATE ON public.shopping_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX shopping_list_items_list_idx ON public.shopping_list_items (list_id, position);

CREATE TRIGGER shopping_list_items_updated_at BEFORE UPDATE ON public.shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX spend_limits_user_scope_idx
  ON public.spend_limits (user_id, coalesce(agent_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TRIGGER spend_limits_updated_at BEFORE UPDATE ON public.spend_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

create index if not exists fitness_workouts_user_schedule_idx on public.fitness_workouts(user_id, scheduled_for desc);

CREATE INDEX finance_transactions_user_idx ON public.finance_transactions(user_id, occurred_on DESC);

CREATE TRIGGER finance_transactions_updated_at BEFORE UPDATE ON public.finance_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX marketing_campaigns_user_idx ON public.marketing_campaigns(user_id, created_at DESC);

CREATE TRIGGER marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

alter table public.fitness_profiles add constraint fitness_profiles_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;

alter table public.fitness_workouts add constraint fitness_workouts_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;

alter table public.fitness_weight_entries add constraint fitness_weight_entries_owner_fkey foreign key(user_id) references auth.users(id) on delete cascade;

create index shopping_tasks_user_id_recovery_idx on public.shopping_tasks(user_id);

create index shopping_tasks_agent_id_recovery_idx on public.shopping_tasks(agent_id);

create index shopping_tasks_task_id_recovery_idx on public.shopping_tasks(task_id);

create index purchase_requests_user_id_recovery_idx on public.purchase_requests(user_id);

create index purchase_requests_shopping_task_id_recovery_idx on public.purchase_requests(shopping_task_id);

create index purchase_requests_shopping_result_id_recovery_idx on public.purchase_requests(shopping_result_id);

create index purchase_requests_approval_request_id_recovery_idx on public.purchase_requests(approval_request_id);

create index product_watches_agent_id_recovery_idx on public.product_watches(agent_id);

create index product_watches_shopping_result_id_recovery_idx on public.product_watches(shopping_result_id);

create index shopping_lists_agent_id_recovery_idx on public.shopping_lists(agent_id);

create index shopping_list_items_user_id_recovery_idx on public.shopping_list_items(user_id);

create index shopping_list_items_shopping_task_id_recovery_idx on public.shopping_list_items(shopping_task_id);

create index shopping_list_items_shopping_result_id_recovery_idx on public.shopping_list_items(shopping_result_id);

create index spend_limits_agent_id_recovery_idx on public.spend_limits(agent_id);

create index finance_transactions_org_id_recovery_idx on public.finance_transactions(org_id);

create index marketing_campaigns_org_id_recovery_idx on public.marketing_campaigns(org_id);

alter table public.shopping_tasks enable row level security;

revoke all on public.shopping_tasks from public,anon,authenticated;

grant select,insert,update,delete on public.shopping_tasks to authenticated;

grant all on public.shopping_tasks to service_role;

create policy shopping_tasks_select_own on public.shopping_tasks for select to authenticated using(user_id=(select auth.uid()));

create policy shopping_tasks_insert_own on public.shopping_tasks for insert to authenticated  with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=shopping_tasks.agent_id and p.user_id=(select auth.uid()))) and (task_id is null or exists(select 1 from public.personal_tasks p where p.id=shopping_tasks.task_id and p.user_id=(select auth.uid()))));

create policy shopping_tasks_update_own on public.shopping_tasks for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=shopping_tasks.agent_id and p.user_id=(select auth.uid()))) and (task_id is null or exists(select 1 from public.personal_tasks p where p.id=shopping_tasks.task_id and p.user_id=(select auth.uid()))));

create policy shopping_tasks_delete_own on public.shopping_tasks for delete to authenticated using(user_id=(select auth.uid()));

alter table public.shopping_results enable row level security;

revoke all on public.shopping_results from public,anon,authenticated;

grant select,insert,update,delete on public.shopping_results to authenticated;

grant all on public.shopping_results to service_role;

create policy shopping_results_select_own on public.shopping_results for select to authenticated using(exists(select 1 from public.shopping_tasks p where p.id=shopping_results.shopping_task_id and p.user_id=(select auth.uid())));

create policy shopping_results_insert_own on public.shopping_results for insert to authenticated  with check(exists(select 1 from public.shopping_tasks p where p.id=shopping_results.shopping_task_id and p.user_id=(select auth.uid())));

create policy shopping_results_update_own on public.shopping_results for update to authenticated using(exists(select 1 from public.shopping_tasks p where p.id=shopping_results.shopping_task_id and p.user_id=(select auth.uid()))) with check(exists(select 1 from public.shopping_tasks p where p.id=shopping_results.shopping_task_id and p.user_id=(select auth.uid())));

create policy shopping_results_delete_own on public.shopping_results for delete to authenticated using(exists(select 1 from public.shopping_tasks p where p.id=shopping_results.shopping_task_id and p.user_id=(select auth.uid())));

alter table public.purchase_requests enable row level security;

revoke all on public.purchase_requests from public,anon,authenticated;

grant select,insert,update,delete on public.purchase_requests to authenticated;

grant all on public.purchase_requests to service_role;

create policy purchase_requests_select_own on public.purchase_requests for select to authenticated using(user_id=(select auth.uid()));

create policy purchase_requests_insert_own on public.purchase_requests for insert to authenticated  with check(user_id=(select auth.uid()) and (shopping_task_id is null or exists(select 1 from public.shopping_tasks p where p.id=purchase_requests.shopping_task_id and p.user_id=(select auth.uid()))) and (approval_request_id is null or exists(select 1 from public.approval_requests p where p.id=purchase_requests.approval_request_id and p.user_id=(select auth.uid()))) and (shopping_result_id is null or exists(select 1 from public.shopping_results r join public.shopping_tasks p on p.id=r.shopping_task_id where r.id=purchase_requests.shopping_result_id and p.user_id=(select auth.uid()) and (purchase_requests.shopping_task_id is null or purchase_requests.shopping_task_id=r.shopping_task_id))));

create policy purchase_requests_update_own on public.purchase_requests for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (shopping_task_id is null or exists(select 1 from public.shopping_tasks p where p.id=purchase_requests.shopping_task_id and p.user_id=(select auth.uid()))) and (approval_request_id is null or exists(select 1 from public.approval_requests p where p.id=purchase_requests.approval_request_id and p.user_id=(select auth.uid()))) and (shopping_result_id is null or exists(select 1 from public.shopping_results r join public.shopping_tasks p on p.id=r.shopping_task_id where r.id=purchase_requests.shopping_result_id and p.user_id=(select auth.uid()) and (purchase_requests.shopping_task_id is null or purchase_requests.shopping_task_id=r.shopping_task_id))));

create policy purchase_requests_delete_own on public.purchase_requests for delete to authenticated using(user_id=(select auth.uid()));

alter table public.product_watches enable row level security;

revoke all on public.product_watches from public,anon,authenticated;

grant select,insert,update,delete on public.product_watches to authenticated;

grant all on public.product_watches to service_role;

create policy product_watches_select_own on public.product_watches for select to authenticated using(user_id=(select auth.uid()));

create policy product_watches_insert_own on public.product_watches for insert to authenticated  with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=product_watches.agent_id and p.user_id=(select auth.uid()))) and (shopping_result_id is null or exists(select 1 from public.shopping_results r join public.shopping_tasks p on p.id=r.shopping_task_id where r.id=product_watches.shopping_result_id and p.user_id=(select auth.uid()))));

create policy product_watches_update_own on public.product_watches for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=product_watches.agent_id and p.user_id=(select auth.uid()))) and (shopping_result_id is null or exists(select 1 from public.shopping_results r join public.shopping_tasks p on p.id=r.shopping_task_id where r.id=product_watches.shopping_result_id and p.user_id=(select auth.uid()))));

create policy product_watches_delete_own on public.product_watches for delete to authenticated using(user_id=(select auth.uid()));

alter table public.shopping_lists enable row level security;

revoke all on public.shopping_lists from public,anon,authenticated;

grant select,insert,update,delete on public.shopping_lists to authenticated;

grant all on public.shopping_lists to service_role;

create policy shopping_lists_select_own on public.shopping_lists for select to authenticated using(user_id=(select auth.uid()));

create policy shopping_lists_insert_own on public.shopping_lists for insert to authenticated  with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=shopping_lists.agent_id and p.user_id=(select auth.uid()))));

create policy shopping_lists_update_own on public.shopping_lists for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=shopping_lists.agent_id and p.user_id=(select auth.uid()))));

create policy shopping_lists_delete_own on public.shopping_lists for delete to authenticated using(user_id=(select auth.uid()));

alter table public.shopping_list_items enable row level security;

revoke all on public.shopping_list_items from public,anon,authenticated;

grant select,insert,update,delete on public.shopping_list_items to authenticated;

grant all on public.shopping_list_items to service_role;

create policy shopping_list_items_select_own on public.shopping_list_items for select to authenticated using(user_id=(select auth.uid()));

create policy shopping_list_items_insert_own on public.shopping_list_items for insert to authenticated  with check(user_id=(select auth.uid()) and (exists(select 1 from public.shopping_lists p where p.id=shopping_list_items.list_id and p.user_id=(select auth.uid()))) and (shopping_task_id is null or exists(select 1 from public.shopping_tasks p where p.id=shopping_list_items.shopping_task_id and p.user_id=(select auth.uid()))) and (shopping_result_id is null or exists(select 1 from public.shopping_results r join public.shopping_tasks p on p.id=r.shopping_task_id where r.id=shopping_list_items.shopping_result_id and p.user_id=(select auth.uid()) and (shopping_list_items.shopping_task_id is null or shopping_list_items.shopping_task_id=r.shopping_task_id))));

create policy shopping_list_items_update_own on public.shopping_list_items for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (exists(select 1 from public.shopping_lists p where p.id=shopping_list_items.list_id and p.user_id=(select auth.uid()))) and (shopping_task_id is null or exists(select 1 from public.shopping_tasks p where p.id=shopping_list_items.shopping_task_id and p.user_id=(select auth.uid()))) and (shopping_result_id is null or exists(select 1 from public.shopping_results r join public.shopping_tasks p on p.id=r.shopping_task_id where r.id=shopping_list_items.shopping_result_id and p.user_id=(select auth.uid()) and (shopping_list_items.shopping_task_id is null or shopping_list_items.shopping_task_id=r.shopping_task_id))));

create policy shopping_list_items_delete_own on public.shopping_list_items for delete to authenticated using(user_id=(select auth.uid()));

alter table public.spend_limits enable row level security;

revoke all on public.spend_limits from public,anon,authenticated;

grant select,insert,update,delete on public.spend_limits to authenticated;

grant all on public.spend_limits to service_role;

create policy spend_limits_select_own on public.spend_limits for select to authenticated using(user_id=(select auth.uid()));

create policy spend_limits_insert_own on public.spend_limits for insert to authenticated  with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=spend_limits.agent_id and p.user_id=(select auth.uid()))));

create policy spend_limits_update_own on public.spend_limits for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (agent_id is null or exists(select 1 from public.personal_agents p where p.id=spend_limits.agent_id and p.user_id=(select auth.uid()))));

create policy spend_limits_delete_own on public.spend_limits for delete to authenticated using(user_id=(select auth.uid()));

alter table public.personal_os_profiles enable row level security;

revoke all on public.personal_os_profiles from public,anon,authenticated;

grant select,insert,update on public.personal_os_profiles to authenticated;

grant all on public.personal_os_profiles to service_role;

create policy personal_os_profiles_select_own on public.personal_os_profiles for select to authenticated using(user_id=(select auth.uid()));

create policy personal_os_profiles_insert_own on public.personal_os_profiles for insert to authenticated  with check(user_id=(select auth.uid()) and (primary_agent_id is null or exists(select 1 from public.personal_agents p where p.id=personal_os_profiles.primary_agent_id and p.user_id=(select auth.uid()))));

create policy personal_os_profiles_update_own on public.personal_os_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (primary_agent_id is null or exists(select 1 from public.personal_agents p where p.id=personal_os_profiles.primary_agent_id and p.user_id=(select auth.uid()))));

alter table public.fitness_profiles enable row level security;

revoke all on public.fitness_profiles from public,anon,authenticated;

grant select,insert,update,delete on public.fitness_profiles to authenticated;

grant all on public.fitness_profiles to service_role;

create policy fitness_profiles_select_own on public.fitness_profiles for select to authenticated using(user_id=(select auth.uid()));

create policy fitness_profiles_insert_own on public.fitness_profiles for insert to authenticated  with check(user_id=(select auth.uid()));

create policy fitness_profiles_update_own on public.fitness_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy fitness_profiles_delete_own on public.fitness_profiles for delete to authenticated using(user_id=(select auth.uid()));

alter table public.fitness_workouts enable row level security;

revoke all on public.fitness_workouts from public,anon,authenticated;

grant select,insert,update,delete on public.fitness_workouts to authenticated;

grant all on public.fitness_workouts to service_role;

create policy fitness_workouts_select_own on public.fitness_workouts for select to authenticated using(user_id=(select auth.uid()));

create policy fitness_workouts_insert_own on public.fitness_workouts for insert to authenticated  with check(user_id=(select auth.uid()));

create policy fitness_workouts_update_own on public.fitness_workouts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy fitness_workouts_delete_own on public.fitness_workouts for delete to authenticated using(user_id=(select auth.uid()));

alter table public.fitness_weight_entries enable row level security;

revoke all on public.fitness_weight_entries from public,anon,authenticated;

grant select,insert,update,delete on public.fitness_weight_entries to authenticated;

grant all on public.fitness_weight_entries to service_role;

create policy fitness_weight_entries_select_own on public.fitness_weight_entries for select to authenticated using(user_id=(select auth.uid()));

create policy fitness_weight_entries_insert_own on public.fitness_weight_entries for insert to authenticated  with check(user_id=(select auth.uid()));

create policy fitness_weight_entries_update_own on public.fitness_weight_entries for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create policy fitness_weight_entries_delete_own on public.fitness_weight_entries for delete to authenticated using(user_id=(select auth.uid()));

alter table public.finance_transactions enable row level security;

revoke all on public.finance_transactions from public,anon,authenticated;

grant select,insert,update,delete on public.finance_transactions to authenticated;

grant all on public.finance_transactions to service_role;

create policy finance_transactions_select_own on public.finance_transactions for select to authenticated using(user_id=(select auth.uid()));

create policy finance_transactions_insert_own on public.finance_transactions for insert to authenticated  with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy finance_transactions_update_own on public.finance_transactions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy finance_transactions_delete_own on public.finance_transactions for delete to authenticated using(user_id=(select auth.uid()));

alter table public.marketing_campaigns enable row level security;

revoke all on public.marketing_campaigns from public,anon,authenticated;

grant select,insert,update,delete on public.marketing_campaigns to authenticated;

grant all on public.marketing_campaigns to service_role;

create policy marketing_campaigns_select_own on public.marketing_campaigns for select to authenticated using(user_id=(select auth.uid()));

create policy marketing_campaigns_insert_own on public.marketing_campaigns for insert to authenticated  with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy marketing_campaigns_update_own on public.marketing_campaigns for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and (org_id is null or private.is_org_member(org_id)));

create policy marketing_campaigns_delete_own on public.marketing_campaigns for delete to authenticated using(user_id=(select auth.uid()));

notify pgrst,'reload schema';
