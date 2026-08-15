-- Durable execution state for approval-backed external actions.
-- Approval status records the operator's decision; execution_status records
-- whether the authorised side effect subsequently completed.
alter table public.approval_requests
  add column if not exists execution_status text,
  add column if not exists executed_at timestamptz,
  add column if not exists execution_error text,
  add column if not exists execution_result jsonb;

alter table public.approval_requests
  drop constraint if exists approval_requests_execution_status_check;
alter table public.approval_requests
  add constraint approval_requests_execution_status_check
  check (execution_status is null or execution_status in ('executing','succeeded','failed'));

create index if not exists approval_requests_execution_idx
  on public.approval_requests(user_id, execution_status)
  where execution_status is not null;

insert into public.tools
  (slug, name, category, description, kind, requires_approval, risk_level, min_plan, is_active, config_schema)
values
  (
    'slack_post',
    'Slack Post',
    'communication',
    'Prepare a Slack message for explicit operator approval, then post it through the connected Slack account.',
    'native',
    true,
    'medium',
    'builder',
    true,
    '{"type":"object","properties":{"channel":{"type":"string"},"text":{"type":"string"}},"required":["channel","text"]}'::jsonb
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

update public.tools
set name = 'Email Draft',
    description = 'Prepare a Gmail or Outlook draft for explicit approval. Approval creates the draft but does not send it.',
    requires_approval = true,
    risk_level = 'medium'
where slug = 'email_send';

update public.tools
set description = 'Read calendar context and prepare real connected-calendar events for explicit approval.',
    requires_approval = false,
    risk_level = 'medium'
where slug = 'calendar';
