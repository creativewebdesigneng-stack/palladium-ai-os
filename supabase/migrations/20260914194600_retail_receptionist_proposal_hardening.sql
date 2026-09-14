-- Harden direct Data API proposal insertion as well as the UI/server path.
alter table public.retail_call_actions
  add constraint retail_call_actions_payload_object_check check (jsonb_typeof(payload) = 'object'),
  add constraint retail_call_actions_result_object_check check (jsonb_typeof(result) = 'object'),
  add constraint retail_call_actions_payload_size_check check (octet_length(payload::text) <= 20000),
  add constraint retail_call_actions_result_size_check check (octet_length(result::text) <= 20000),
  add constraint retail_call_actions_idempotency_length_check check (idempotency_key is null or char_length(idempotency_key) <= 300);

drop policy if exists retail_call_actions_insert_own on public.retail_call_actions;
create policy retail_call_actions_insert_own on public.retail_call_actions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and status = 'proposed'
    and approval_required = true
    and approved_at is null
    and executed_at is null
    and coalesce(last_error, '') = ''
    and result = '{}'::jsonb
    and (
      (action_type in ('create_appointment','mark_follow_up','close_call') and target_appointment_id is null)
      or
      (action_type in ('reschedule_appointment','cancel_appointment') and target_appointment_id is not null)
    )
    and exists (
      select 1 from public.retail_call_inbox c
      where c.id = call_id and c.workspace_id = workspace_id and c.user_id = (select auth.uid())
    )
    and (
      target_appointment_id is null
      or exists (
        select 1 from public.retail_appointments a
        where a.id = target_appointment_id and a.workspace_id = workspace_id and a.user_id = (select auth.uid())
      )
    )
  );
