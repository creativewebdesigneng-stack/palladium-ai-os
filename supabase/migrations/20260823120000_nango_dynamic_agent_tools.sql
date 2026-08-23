-- Dynamic, schema-discovered Nango tools. Existing agents with connected_service
-- receive these capabilities through the runtime's backwards-compatible grant.
insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  ('nango_capabilities', 'Dynamic App Discovery', 'integration',
   'Discover typed actions advertised by the authenticated user''s connected Nango providers.',
   'builtin', false, 'low', 'builder', true,
   '{"read_only":true,"credentials_server_side":true,"dynamic_schema":true}'::jsonb),
  ('nango_action', 'Dynamic App Actions', 'integration',
   'Execute discovered read-only Nango actions and route write or destructive actions through immutable approval requests.',
   'builtin', false, 'medium', 'builder', true,
   '{"credentials_server_side":true,"dynamic_schema":true,"risk_classification":true,"approval_gated_writes":true}'::jsonb)
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
