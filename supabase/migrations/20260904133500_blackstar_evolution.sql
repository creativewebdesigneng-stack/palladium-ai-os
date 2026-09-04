-- Blackstar Evolution: measured improvement proposals only.
-- This table never authorises or applies a runtime/configuration mutation.

create table if not exists public.agent_evolution_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  agent_id uuid not null,
  correlation_id uuid null,
  change_type text not null check (change_type in ('prompt','routing','skill_policy','memory_policy','workflow_policy')),
  change_summary text not null check (char_length(change_summary) between 1 and 1000),
  baseline_metrics jsonb not null,
  candidate_metrics jsonb not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  decision_status text not null check (decision_status in ('promote','review','reject')),
  decision_score double precision not null,
  decision_reasons jsonb not null default '[]'::jsonb,
  requires_approval boolean not null default true check (requires_approval = true),
  applied boolean not null default false check (applied = false),
  created_at timestamptz not null default now()
);

create index if not exists agent_evolution_owner_agent_created_idx on public.agent_evolution_proposals(user_id, agent_id, created_at desc);
create index if not exists agent_evolution_correlation_idx on public.agent_evolution_proposals(correlation_id) where correlation_id is not null;

alter table public.agent_evolution_proposals enable row level security;
revoke all on public.agent_evolution_proposals from anon;
revoke all on public.agent_evolution_proposals from authenticated;
grant select, insert on public.agent_evolution_proposals to authenticated;

create policy "agent evolution owner select"
  on public.agent_evolution_proposals for select to authenticated
  using (user_id = auth.uid());

create policy "agent evolution owner insert"
  on public.agent_evolution_proposals for insert to authenticated
  with check (user_id = auth.uid() and requires_approval = true and applied = false);

comment on table public.agent_evolution_proposals is 'Owner-scoped Blackstar measured-improvement proposals. Advisory and approval-gated; never direct self-modification.';
