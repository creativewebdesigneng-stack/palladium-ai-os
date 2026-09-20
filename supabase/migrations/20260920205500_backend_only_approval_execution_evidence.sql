-- Approval decisions belong to the owner, but provider execution evidence
-- must come from the trusted backend, not a browser-side Data API update.
-- Preserve existing owner-scoped status/decision grants and the canonical
-- immutable-payload and terminal-decision trigger.
revoke update (execution_status,executed_at,execution_error,execution_result)
  on public.approval_requests from authenticated;

create or replace function public.guard_approval_execution_evidence()
returns trigger language plpgsql security invoker
set search_path=public
as $$
begin
  if coalesce(auth.role(),'')='authenticated'
    and row(new.execution_status,new.executed_at,new.execution_error,new.execution_result)
      is distinct from
        row(old.execution_status,old.executed_at,old.execution_error,old.execution_result)
  then
    raise exception 'Only the backend may record approval execution evidence';
  end if;
  return new;
end
$$;

drop trigger if exists approval_execution_evidence_guard on public.approval_requests;
create trigger approval_execution_evidence_guard
 before update on public.approval_requests
 for each row execute function public.guard_approval_execution_evidence();
revoke execute on function public.guard_approval_execution_evidence()
  from public,anon,authenticated;
notify pgrst,'reload schema';
