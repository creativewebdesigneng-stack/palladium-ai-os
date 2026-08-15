-- Approval-backed writes for connected CRM/project-management services.
insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  (
    'connected_service_write',
    'Connected Service Write',
    'productivity',
    'Prepare bounded HubSpot, Asana, Linear or Notion writes for explicit operator approval. The provider write runs only after approval.',
    'native',
    true,
    'medium',
    'builder',
    true,
    '{"type":"object","properties":{"provider":{"type":"string","enum":["hubspot","asana","linear","notion"]},"action":{"type":"string"}},"required":["provider","action"]}'::jsonb
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level,
  min_plan = excluded.min_plan,
  is_active = excluded.is_active,
  config_schema = excluded.config_schema;
