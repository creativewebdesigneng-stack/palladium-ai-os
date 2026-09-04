-- Blackstar Collective Intelligence deliberation history.
-- Results are advisory synthesis with provenance; they never grant execution authority.

create table if not exists public.agent_collective_deliberations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid null,
  correlation_id uuid null,
  topic text not null check (char_length(topic) between 1 and 500),
  participant_agent_ids uuid[] not null,
  proposals jsonb not null,
  consensus jsonb not null,
  status text not null check (status in ('consensus','contested')),
  selected_answer_key text not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  agreement_ratio double precision not null check (agreement_ratio >= 0 and agreement_ratio <= 1),
  created_at timestamptz not null default now()
);

create index if not exists agent_collective_deliberations_owner_created_idx on public.agent_collective_deliberations(user_id, created_at desc);
create index if not exists agent_collective_deliberations_correlation_idx on public.agent_collective_deliberations(correlation_id) where correlation_id is not null;

alter table public.agent_collective_deliberations enable row level security;
revoke all on public.agent_collective_deliberations from anon;
revoke all on public.agent_collective_deliberations from authenticated;
grant select, insert on public.agent_collective_deliberations to authenticated;

create policy "collective deliberations owner select"
  on public.agent_collective_deliberations for select to authenticated
  using (user_id = auth.uid());

create policy "collective deliberations owner insert"
  on public.agent_collective_deliberations for insert to authenticated
  with check (user_id = auth.uid());

comment on table public.agent_collective_deliberations is 'Owner-scoped Blackstar multi-agent synthesis records with provenance. Advisory only; never authorization, approval, billing, or execution proof.';
