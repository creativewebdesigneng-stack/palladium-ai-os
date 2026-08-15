-- Read-only OAuth-connected service bridge for the agent runtime.
insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  ('connected_service', 'Connected Services', 'integration',
   'Read data from an OAuth-connected Google, Microsoft, Slack, CRM or project-management account through a fixed read-only operation whitelist.',
   'builtin', false, 'medium', 'builder', true,
   '{"read_only":true,"arbitrary_urls":false,"credentials_server_side":true}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  kind = excluded.kind,
  requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level,
  min_plan = excluded.min_plan,
  is_active = excluded.is_active,
  config_schema = excluded.config_schema,
  updated_at = now();
