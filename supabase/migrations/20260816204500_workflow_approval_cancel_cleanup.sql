-- A workflow paused at an approval gate has no active worker polling for
-- cancel_requested. Finalize that cancellation inside the same database update
-- so the run, approval request, and approval step ledger cannot remain stuck.

create or replace function public.finalize_waiting_workflow_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.cancel_requested, false) = true
     and old.status = 'waiting_for_approval'
     and new.status = 'waiting_for_approval' then

    if old.waiting_approval_request_id is not null then
      update public.approval_requests
      set status = 'expired',
          decided_at = coalesce(decided_at, now()),
          decision_note = coalesce(decision_note, 'Workflow run was cancelled by its owner.')
      where id = old.waiting_approval_request_id
        and user_id = new.user_id
        and status = 'pending';
    end if;

    if old.waiting_step_id is not null then
      update public.workflow_step_runs
      set status = 'cancelled',
          error = coalesce(error, 'Workflow run was cancelled while awaiting approval.'),
          completed_at = coalesce(completed_at, now())
      where run_id = new.id
        and step_id = old.waiting_step_id
        and user_id = new.user_id
        and status = 'waiting_for_approval';
    end if;

    new.status := 'cancelled';
    new.error := coalesce(new.error, 'Workflow run cancelled by the operator.');
    new.completed_at := coalesce(new.completed_at, now());
    new.waiting_approval_request_id := null;
    new.waiting_step_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists finalize_waiting_workflow_cancellation on public.workflow_runs;

create trigger finalize_waiting_workflow_cancellation
before update of cancel_requested on public.workflow_runs
for each row
execute function public.finalize_waiting_workflow_cancellation();
