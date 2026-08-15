-- Approval-gated GitHub writes for PalladiumAI agents.
-- The runtime tool only queues immutable high-risk approval requests; provider
-- mutation occurs later through the approved GitHub action executor.
insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  (
    'github_write',
    'GitHub Write',
    'developer',
    'Prepare bounded GitHub branch creation and file create/update actions for explicit operator approval. No GitHub mutation occurs until approval is claimed.',
    'native',
    true,
    'high',
    'builder',
    true,
    '{"type":"object","properties":{"action":{"type":"string","enum":["github_branch_create","github_file_create","github_file_update"]},"repository":{"type":"string"},"branch":{"type":"string"},"base_sha":{"type":"string"},"path":{"type":"string"},"content":{"type":"string"},"message":{"type":"string"},"sha":{"type":"string"}},"required":["action","repository","branch"]}'::jsonb
  )
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  kind = excluded.kind,
  requires_approval = excluded.requires_approval,
  risk_level = excluded.risk_level,
  min_plan = excluded.min_plan,
  is_active = excluded.is_active,
  config_schema = excluded.config_schema;
