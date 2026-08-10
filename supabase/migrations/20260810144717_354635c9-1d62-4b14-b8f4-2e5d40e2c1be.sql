-- Align the catalogue with the executable registry slugs.
delete from public.tools where slug in ('browse','crm','payments');

insert into public.tools (slug, name, category, description, kind, requires_approval, risk_level, min_plan, config_schema, is_active)
values
  ('web_search','Web Search','research','Search the public web and return ranked snippets.','builtin',false,'low','explorer','{}'::jsonb,true),
  ('web_fetch','Web Fetch','research','Fetch a public page and extract readable text.','builtin',false,'low','explorer','{"allowed_domains":"string[]"}'::jsonb,true),
  ('browser','Browser Agent','automation','Drive a real browser session inside a domain allowlist. Cannot complete payments.','builtin',false,'medium','builder','{"allowed_domains":"string[]","provider":"string"}'::jsonb,true),
  ('http_request','HTTP / API','api','Call an allowlisted HTTP API endpoint.','builtin',false,'medium','builder','{"allowed_domains":"string[]"}'::jsonb,true),
  ('file_analysis','File Analysis','knowledge','Read and summarise a stored document from the memory vault.','builtin',false,'low','explorer','{}'::jsonb,true),
  ('data_analysis','Data Analysis','data','Compute statistics and aggregates over a supplied dataset.','builtin',false,'low','explorer','{}'::jsonb,true),
  ('calendar','Calendar','productivity','Read and propose calendar events. Writes require approval.','builtin',true,'low','builder','{}'::jsonb,true),
  ('email_send','Email','communication','Draft and send email on the operator''s behalf. Always requires approval.','builtin',true,'high','builder','{}'::jsonb,true),
  ('shopping_search','Shopping','commerce','Search products, compare sellers, check availability and build lists.','builtin',false,'medium','builder','{"allowed_domains":"string[]","spend_cap":"number"}'::jsonb,true),
  ('database_query','Database','database','Run a read-only query against the operator''s own data.','builtin',false,'medium','builder','{}'::jsonb,true),
  ('code_exec','Code Execution','development','Evaluate a sandboxed expression or short script.','builtin',true,'high','business','{}'::jsonb,true),
  ('memory_search','Memory Search','knowledge','Search stored facts, preferences and documents.','builtin',false,'low','explorer','{}'::jsonb,true),
  ('memory_write','Memory Write','knowledge','Store a durable fact or preference.','builtin',false,'low','explorer','{}'::jsonb,true),
  ('checkout','Prepare Checkout','commerce','Prepare a purchase for explicit human approval. Never pays.','builtin',true,'high','builder','{"spend_cap":"number"}'::jsonb,true),
  ('request_approval','Request Approval','automation','Raise an approval request for a real-world action.','builtin',true,'medium','explorer','{}'::jsonb,true)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  kind = excluded.kind,
  requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level,
  min_plan = excluded.min_plan,
  config_schema = excluded.config_schema,
  is_active = true,
  updated_at = now();

update public.tools set is_active = false
where slug in ('files','shopping','calendar_old');

update public.tools set is_active = true where slug = 'calendar';

alter table public.tool_permissions
  alter column allowed_domains set default '{}'::text[];
