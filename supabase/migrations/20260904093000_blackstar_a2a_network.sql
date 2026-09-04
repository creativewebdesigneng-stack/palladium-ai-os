create table if not exists public.agent_a2a_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  org_id uuid null,
  sender_agent_id uuid not null,
  recipient_agent_id uuid not null,
  delegation_grant_id uuid null,
  correlation_id uuid null,
  scope text not null check (length(scope) between 1 and 120),
  kind text not null default 'request' check (kind in ('request','response','event')),
  payload jsonb not null default '{}'::jsonb,
  hop integer not null default 0 check (hop between 0 and 4),
  status text not null default 'queued' check (status in ('queued','pending_approval','delivered','consumed','rejected','expired')),
  requires_approval boolean not null default false,
  expires_at timestamptz null,
  delivered_at timestamptz null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_a2a_distinct_agents check (sender_agent_id <> recipient_agent_id)
);

create index if not exists agent_a2a_messages_user_created_idx
  on public.agent_a2a_messages (user_id, created_at desc);
create index if not exists agent_a2a_messages_recipient_status_idx
  on public.agent_a2a_messages (recipient_agent_id, status, created_at);
create index if not exists agent_a2a_messages_correlation_idx
  on public.agent_a2a_messages (correlation_id)
  where correlation_id is not null;

alter table public.agent_a2a_messages enable row level security;

revoke all on table public.agent_a2a_messages from anon;
grant select, insert, update on table public.agent_a2a_messages to authenticated;

create policy "a2a messages owner select"
  on public.agent_a2a_messages
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "a2a messages owner insert"
  on public.agent_a2a_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.personal_agents sender
      where sender.id = sender_agent_id
        and sender.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.personal_agents recipient
      where recipient.id = recipient_agent_id
        and recipient.user_id = auth.uid()
        and coalesce(recipient.org_id_fk, recipient.org_id) is not distinct from org_id
    )
    and exists (
      select 1
      from public.personal_agents sender
      where sender.id = sender_agent_id
        and sender.user_id = auth.uid()
        and coalesce(sender.org_id_fk, sender.org_id) is not distinct from org_id
    )
  );

create policy "a2a messages owner update"
  on public.agent_a2a_messages
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.personal_agents sender
      where sender.id = sender_agent_id
        and sender.user_id = auth.uid()
        and coalesce(sender.org_id_fk, sender.org_id) is not distinct from org_id
    )
    and exists (
      select 1
      from public.personal_agents recipient
      where recipient.id = recipient_agent_id
        and recipient.user_id = auth.uid()
        and coalesce(recipient.org_id_fk, recipient.org_id) is not distinct from org_id
    )
  );

comment on table public.agent_a2a_messages is
  'Blackstar Trust Fabric governed agent-to-agent message envelopes. Runtime execution remains in the canonical Agent Runtime.';