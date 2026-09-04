drop policy if exists "a2a messages owner insert" on public.agent_a2a_messages;
drop policy if exists "a2a messages owner update" on public.agent_a2a_messages;

create policy "a2a messages owner insert"
  on public.agent_a2a_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.personal_agents sender
      where sender.id = agent_a2a_messages.sender_agent_id
        and sender.user_id = auth.uid()
        and coalesce(sender.org_id_fk, sender.org_id) is not distinct from agent_a2a_messages.org_id
    )
    and exists (
      select 1
      from public.personal_agents recipient
      where recipient.id = agent_a2a_messages.recipient_agent_id
        and recipient.user_id = auth.uid()
        and coalesce(recipient.org_id_fk, recipient.org_id) is not distinct from agent_a2a_messages.org_id
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
      where sender.id = agent_a2a_messages.sender_agent_id
        and sender.user_id = auth.uid()
        and coalesce(sender.org_id_fk, sender.org_id) is not distinct from agent_a2a_messages.org_id
    )
    and exists (
      select 1
      from public.personal_agents recipient
      where recipient.id = agent_a2a_messages.recipient_agent_id
        and recipient.user_id = auth.uid()
        and coalesce(recipient.org_id_fk, recipient.org_id) is not distinct from agent_a2a_messages.org_id
    )
  );
