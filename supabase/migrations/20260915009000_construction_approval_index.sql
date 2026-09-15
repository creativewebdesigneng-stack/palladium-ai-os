-- Mission Control must never execute safety-critical or engineering-authority construction actions as generic provider writes.
-- These approvals authorize a competent human-controlled construction workflow; execution remains explicit in the domain.
create index if not exists construction_agent_actions_approval_idx on public.construction_agent_actions(approval_request_id) where approval_request_id is not null;
