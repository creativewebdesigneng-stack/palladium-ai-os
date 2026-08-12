-- 1. Align the catalogue with the executable registry.
delete from public.tools where slug in ('shopping','files','checkout');

insert into public.tools (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  ('web_search','Web Search','research','Search the public web and return short result snippets.','builtin',false,'low','explorer',true,
    '{"allowed_domains":{"type":"domain_list","label":"Restrict searching to these domains"}}'::jsonb),
  ('web_fetch','Web Fetch','research','Fetch a public web page and return its readable text.','builtin',false,'low','explorer',true,
    '{"allowed_domains":{"type":"domain_list","label":"Fetchable domains"}}'::jsonb),
  ('browser','Browser Agent','automation','Drive a browser session to navigate and read pages inside the agent allow-list. Cannot pay for anything.','builtin',false,'medium','builder',true,
    '{"allowed_domains":{"type":"domain_list","label":"Browsable domains","required":true}}'::jsonb),
  ('http_request','HTTP / API','api','Call an allow-listed HTTP API with GET or POST. Responses are truncated.','builtin',false,'medium','builder',true,
    '{"allowed_domains":{"type":"domain_list","label":"Callable API hosts","required":true}}'::jsonb),
  ('file_analysis','File Analysis','knowledge','Read a document from the operator''s knowledge vault and return its text for analysis.','builtin',false,'low','explorer',true,'{}'::jsonb),
  ('data_analysis','Data Analysis','data','Compute count, sum, mean, min, max and median over a numeric series.','builtin',false,'low','explorer',true,'{}'::jsonb),
  ('calendar','Calendar','productivity','List upcoming scheduled items or propose a new one for approval.','builtin',true,'medium','builder',true,
    '{"integration":{"type":"integration","providers":["google","microsoft"],"label":"Calendar account"}}'::jsonb),
  ('email_send','Email','communication','Draft an email for the operator. Drafts are queued for explicit approval; the tool never sends mail itself.','builtin',true,'high','builder',true,
    '{"integration":{"type":"integration","providers":["google","microsoft"],"label":"Mailbox"}}'::jsonb),
  ('shopping_search','Shopping','commerce','Search products across allow-listed retailers and compare price, delivery, availability and specifications. Never buys.','builtin',false,'medium','builder',true,
    '{"allowed_domains":{"type":"domain_list","label":"Retailers"},"spend_cap":{"type":"currency","label":"Research budget ceiling"}}'::jsonb),
  ('prepare_purchase','Prepare Purchase','commerce','Prepare an itemised purchase for the operator to approve. Does not pay.','builtin',true,'high','builder',true,
    '{"allowed_domains":{"type":"domain_list","label":"Approved sellers","required":true},"spend_cap":{"type":"currency","label":"Per-transaction cap"}}'::jsonb),
  ('database_query','Database','database','Read rows from the operator''s own tables. Read-only.','builtin',false,'medium','builder',true,'{}'::jsonb),
  ('code_exec','Code Execution','development','Evaluate a short, sandboxed expression. No network, no filesystem, no imports.','builtin',true,'high','business',true,'{}'::jsonb),
  ('memory_search','Memory Search','knowledge','Search the operator''s stored preferences and facts.','builtin',false,'low','explorer',true,'{}'::jsonb),
  ('memory_write','Memory Write','knowledge','Store a durable fact or preference for the operator, subject to their memory settings.','builtin',false,'low','explorer',true,'{}'::jsonb),
  ('request_approval','Request Approval','automation','Ask the operator to approve a real-world action.','builtin',true,'medium','explorer',true,'{}'::jsonb),
  ('current_time','Current Time','utility','Get the current UTC date and time.','builtin',false,'low','explorer',true,'{}'::jsonb),
  ('calculator','Calculator','utility','Evaluate an arithmetic expression.','builtin',false,'low','explorer',true,'{}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level,
  min_plan = excluded.min_plan,
  is_active = excluded.is_active,
  config_schema = excluded.config_schema,
  updated_at = now();

-- 2. Richer connection records for third-party integrations.
alter table public.integrations
  add column if not exists integration_type text not null default 'oauth',
  add column if not exists account_label text,
  add column if not exists granted_scopes text[] not null default '{}',
  add column if not exists last_error text,
  add column if not exists expires_at timestamptz;

-- 3. Encrypted OAuth token store. Server-only: no anon/authenticated grants, so
--    browser clients can never read a token even if a policy were mis-written.
create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations(id) on delete cascade,
  user_id uuid not null,
  provider text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_type text not null default 'Bearer',
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

grant all on public.integration_credentials to service_role;

alter table public.integration_credentials enable row level security;

create policy "Only trusted server code may touch integration credentials"
  on public.integration_credentials for all to service_role using (true) with check (true);

create trigger integration_credentials_updated_at
  before update on public.integration_credentials
  for each row execute function public.set_updated_at();

create index if not exists integration_credentials_user_idx
  on public.integration_credentials (user_id, provider);
